// admin.js - Integrated Admin Script
// [MIGRATION] Switched from ES Module to Global Script for local file support.

// 엑셀 스타일의 Quill 에디터 포맷 설정
if (typeof Quill !== 'undefined') {
    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = ['9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];
    Quill.register(SizeStyle, true);

    const FontStyle = Quill.import('attributors/style/font');
    FontStyle.whitelist = ['Malgun Gothic', 'Calibri', 'Pretendard', 'Gulim', 'Dotum', 'Gungsuh'];
    Quill.register(FontStyle, true);

    // Quill 아이콘을 엑셀 테마로 커스터마이징 (가 밑에 빨간색 밑줄, 채우기 페인트통 등)
    const icons = Quill.import('ui/icons');
    icons['color'] = '<span style="display:inline-flex; flex-direction:column; align-items:center; line-height:1; font-weight:bold; font-family:\'맑은 고딕\',\'Malgun Gothic\'">가<span style="width:14px; height:3px; background:#ff0000; margin-top:1px;"></span></span>';
    icons['background'] = '<i class="fa-solid fa-fill-drip" style="font-size: 11px;"></i>';
}

let db;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error("Supabase library is not loaded. Please check your internet connection and ensure the CDN script is included in admin.html.");
        alert("Supabase 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
        return;
    }

    const { createClient } = supabase;

    // ==========================================
    // 🚨 사용자(관리자)님, 여기에 Supabase 설정값을 넣어주세요! 🚨
    // ==========================================
    const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 시스템 초기화
    checkSession();

    // 제품 검색 및 필터 기능
    const productSearchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const productSortFilter = document.getElementById('productSortFilter');

    function applyProductFilters() {
        const query = productSearchInput ? productSearchInput.value.toLowerCase().trim() : '';
        const catValue = categoryFilter ? categoryFilter.value : 'all';
        const sortValue = productSortFilter ? productSortFilter.value : 'created_at_desc';

        let filtered = globalProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(query);
            // 검색어에 카테고리 ID가 포함된 경우도 인정
            const categoryMatch = (p.category || '').toLowerCase().includes(query);
            
            // 드롭다운 필터 적용
            const catFilterMatch = (catValue === 'all' || p.category === catValue);
            
            return (nameMatch || categoryMatch) && catFilterMatch;
        });

        // 정렬 적용
        if (sortValue === 'display_order_asc') {
            filtered.sort((a, b) => {
                const aKey = getProductConfigKey(a);
                const bKey = getProductConfigKey(b);
                const aDisplayed = aKey && globalDisplayConfigs[aKey] && globalDisplayConfigs[aKey].includes(a.id);
                const bDisplayed = bKey && globalDisplayConfigs[bKey] && globalDisplayConfigs[bKey].includes(b.id);

                if (aDisplayed && bDisplayed) {
                    const aIdx = globalDisplayConfigs[aKey].indexOf(a.id);
                    const bIdx = globalDisplayConfigs[bKey].indexOf(b.id);
                    // 카테고리가 서로 다른 경우 카테고리별로 정렬 후 순서순으로
                    if (aKey !== bKey) {
                        return aKey.localeCompare(bKey) || (aIdx - bIdx);
                    }
                    return aIdx - bIdx;
                } else if (aDisplayed) {
                    return -1; // 전시 중인 제품을 상위로
                } else if (bDisplayed) {
                    return 1;
                } else {
                    // 둘 다 전시 중이 아니면 등록일 최신순 정렬
                    return new Date(b.created_at) - new Date(a.created_at);
                }
            });
        } else {
            // 기본값: 등록일 최신순
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        renderProductTable(filtered);
    }

    if (productSearchInput) productSearchInput.addEventListener('input', applyProductFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyProductFilters);
    if (productSortFilter) productSortFilter.addEventListener('change', applyProductFilters);
    window.applyProductFilters = applyProductFilters;

    // 제품 가격 입력 시 실시간 천 단위 콤마 추가
    const productPriceInput = document.getElementById('productPrice');
    if (productPriceInput) {
        productPriceInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const cleanVal = val.replace(/[^0-9]/g, '');
            if (cleanVal) {
                // 숫자와 콤마/공백으로만 이루어진 입력인 경우만 자동 콤마 포맷팅 수행
                const isNumeric = /^[0-9,\s]+$/.test(val);
                if (isNumeric) {
                    e.target.value = Number(cleanVal).toLocaleString('ko-KR');
                }
            }
        });
    }

    // ---------------------------------------------------------
    // 실시간 채팅 로직 (관리자용 고도화)
    // ---------------------------------------------------------
    const adminChatTrigger = document.getElementById('adminChatTrigger');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBody = document.getElementById('chatBody');
    const chatHeaderTitle = chatWindow ? chatWindow.querySelector('.chat-header h4') : null;

    let currentRoomId = null; // 현재 대화 중인 고객의 Room ID
    let chatRooms = []; // 활성 채팅방 목록

    // 1) 채팅창 토글 및 초기화
    if (adminChatTrigger && chatWindow) {
        adminChatTrigger.addEventListener('click', async () => {
            const isActive = chatWindow.classList.toggle('active');
            if (isActive) {
                await loadChatRooms();
                subscribeToAllChats();
                renderRoomList();
            }
        });
    }

    if (chatCloseBtn && chatWindow) {
        chatCloseBtn.addEventListener('click', () => {
            chatWindow.classList.remove('active');
            currentRoomId = null;
        });
    }

    // 2) 채팅방 목록 불러오기 (최근 메시지 기준)
    async function loadChatRooms() {
        const { data, error } = await db
            .from('chat_messages')
            .select('room_id, sender_name, message, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('채팅방 목록 로드 실패:', error);
            return;
        }

        // 중복 제거하여 최신 채팅방 목록 생성
        const seen = new Set();
        chatRooms = [];
        data.forEach(msg => {
            if (!seen.has(msg.room_id)) {
                seen.add(msg.room_id);
                chatRooms.push({
                    room_id: msg.room_id,
                    sender_name: msg.sender_name || 'Guest',
                    last_message: msg.message,
                    last_time: msg.created_at
                });
            }
        });
    }

    // 3) 채팅방 목록 렌더링
    function renderRoomList() {
        if (!chatBody) return;
        currentRoomId = null;
        if (chatHeaderTitle) chatHeaderTitle.textContent = '실시간 문의 목록';
        
        // 입력창 숨기기 (목록 뷰에서는 필요 없음)
        if (chatInput) chatInput.parentElement.style.display = 'none';

        chatBody.innerHTML = '';
        if (chatRooms.length === 0) {
            chatBody.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">진행 중인 문의가 없습니다.</div>';
            return;
        }

        chatRooms.forEach(room => {
            const roomDiv = document.createElement('div');
            roomDiv.className = 'chat-room-item';
            roomDiv.innerHTML = `
                <div class="room-name">
                    <span>${room.sender_name}</span>
                    <span style="font-size:0.7rem; color:#aaa; font-weight:400;">#${room.room_id.substring(room.room_id.length - 4)}</span>
                </div>
                <div class="room-msg">${room.last_message}</div>
                <div class="room-time">${new Date(room.last_time).toLocaleString()}</div>
            `;
            roomDiv.onclick = () => openChatRoom(room.room_id, room.sender_name);
            chatBody.appendChild(roomDiv);
        });
    }

    // 4) 특정 채팅방 열기
    async function openChatRoom(roomId, senderName) {
        currentRoomId = roomId;
        if (chatHeaderTitle) {
            chatHeaderTitle.innerHTML = `<button id="chatBackBtn" style="background:none; border:none; color:#fff; cursor:pointer; margin-right:10px;"><i class="fa-solid fa-arrow-left"></i></button> ${senderName}`;
            setTimeout(() => {
                document.getElementById('chatBackBtn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderRoomList();
                });
            }, 0);
        }

        if (chatInput) {
            chatInput.parentElement.style.display = 'flex';
            setTimeout(() => chatInput.focus(), 300);
        }

        chatBody.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">대화 내역을 불러오는 중...</div>';

        const { data, error } = await db
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('대화 내역 로드 실패:', error);
            return;
        }

        chatBody.innerHTML = '';
        data.forEach(msg => {
            renderAdminMessage(msg.message, msg.sender_role === 'admin' ? 'user' : 'system');
        });
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // 5) 메시지 렌더링 (관리자 채팅창용)
    function renderAdminMessage(text, type) {
        if (!chatBody) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type === 'user' ? 'user-msg' : 'system-msg'}`;
        msgDiv.textContent = text;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // 6) 실시간 모든 메시지 감시
    let adminChatChannel = null;
    function subscribeToAllChats() {
        if (adminChatChannel) return;
        adminChatChannel = db
            .channel('admin_chat_all')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, (payload) => {
                const newMsg = payload.new;
                
                // 1. 현재 열려있는 채팅방의 메시지인 경우 즉시 렌더링
                if (currentRoomId === newMsg.room_id) {
                    if (newMsg.sender_role === 'customer') {
                        renderAdminMessage(newMsg.message, 'system');
                    }
                } 
                
                // 2. 전체 목록 갱신 (비동기)
                loadChatRooms().then(() => {
                    if (!currentRoomId) renderRoomList();
                });
            })
            .subscribe();
    }

    // 7) 관리자 메시지 전송
    async function sendAdminMessage() {
        if (!chatInput || !chatBody || !currentRoomId) return;
        const text = chatInput.value.trim();
        if (text === '') return;

        // 화면 즉시 표시
        renderAdminMessage(text, 'user');
        chatInput.value = '';

        const { error } = await db
            .from('chat_messages')
            .insert([{
                room_id: currentRoomId,
                sender_role: 'admin',
                sender_name: '관리자',
                message: text
            }]);

        if (error) console.error('관리자 메시지 전송 실패:', error);
    }

    if (chatSendBtn) chatSendBtn.addEventListener('click', sendAdminMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAdminMessage();
    });
});

// ==========================================
// 사이트 통합 카테고리 정의 (전역 참조용)
// ==========================================
// ==========================================
// 사이트 통합 카테고리 정의 (전역 변수)
// ==========================================
window.adminHistoryPushedCount = 0;
let SITE_CATEGORIES = {}; // DB에서 로드됩니다.
const DEFAULT_CATEGORIES = {
    'system': {
        icon: 'fa-server', label: '도서관리시스템',
        middles: {
            'rfid': { label: 'RFID', subs: [{ id: 'rfid-cat-tag', label: '태그 (TAG)' }, { id: 'rfid-cat-anti', label: '분실 방지기' }, { id: 'rfid-cat-reader', label: '리더기' }, { id: 'rfid-cat-return', label: '대출 반납기' }] },
            'em': { label: 'EM', subs: [{ id: 'em-cat-0', label: '분실 방지기' }, { id: 'em-cat-1', label: '감응제거재생기' }, { id: 'em-cat-2', label: '감응 테이프' }] }
        }
    },
    'supplies': {
        icon: 'fa-box-open', label: '도서관 용품',
        middles: {
            'arrange': { label: '정리', subs: [{ id: 'supplies-arrange-cat-0', label: '키퍼' }, { id: 'supplies-arrange-cat-1', label: '색띠라벨' }, { id: 'supplies-arrange-cat-2', label: '라벨용지' }, { id: 'supplies-arrange-cat-3', label: '장갑' }, { id: 'supplies-arrange-cat-4', label: '도장' }, { id: 'supplies-arrange-cat-5', label: '북앤드' }, { id: 'supplies-arrange-cat-6', label: '기타' }] },
            'protect': { label: '보호', subs: [{ id: 'supplies-protect-cat-0', label: '필모시리즈' }, { id: 'supplies-protect-cat-1', label: '중성풀' }, { id: 'supplies-protect-cat-2', label: '양면테이프' }, { id: 'supplies-protect-cat-3', label: '북커버' }] },
            'lend': { label: '대출', subs: [{ id: 'supplies-lend-cat-0', label: '바코드' }, { id: 'supplies-lend-cat-1', label: '카드프린터/기기' }, { id: 'supplies-lend-cat-2', label: '회원증카드' }, { id: 'supplies-lend-cat-3', label: '감열지' }] },
            'etc': { label: '기타', subs: [{ id: 'sterilizer-cat-0', label: '책소독기 소모품' }] }
        }
    },
    'furniture': {
        icon: 'fa-chair', label: '도서관 가구',
        middles: {
            'koas': { label: '코아스', subs: [{ id: 'koas-cat-0', label: '서가' }, { id: 'koas-cat-1', label: '테이블' }, { id: 'koas-cat-2', label: '의자' }, { id: 'koas-cat-3', label: '기타' }] },
            'fomus': { label: '포머스', subs: [{ id: 'fomus-cat-0', label: '서가' }, { id: 'fomus-cat-1', label: '테이블' }, { id: 'fomus-cat-2', label: '의자' }, { id: 'fomus-cat-3', label: '기타' }] },
            'fursys': { label: '퍼시스', subs: [{ id: 'fursys-cat-0', label: '서가' }, { id: 'fursys-cat-1', label: '테이블' }, { id: 'fursys-cat-2', label: '의자' }, { id: 'fursys-cat-3', label: '기타' }] }
        }
    },
    'signage': {
        icon: 'fa-scroll', label: '사인물',
        middles: {
            'sign': { label: '사인물', subs: [{ id: 'sign-class-cat-0', label: '분류/대분류 표지판' }, { id: 'sign-board-cat-0', label: '게시판/이용안내' }, { id: 'sign-date-cat-0', label: '대출반납일력표' }, { id: 'sign-custom-cat-0', label: '제작 사인물' }] }
        }
    },
    'discount': {
        icon: 'fa-tags', label: '할인상품',
        middles: {
            'discount': { label: '전체', subs: [{ id: 'discount-cat-0', label: '할인상품 전체' }] }
        }
    }
};

// DOM Elements - Login & Global
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const emailInput = document.getElementById('adminEmail');
const passInput = document.getElementById('adminPassword');
const loginMessage = document.getElementById('loginMessage');

// DOM Elements - Navigation Tabs
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

// DOM Elements - Product Management (Tab 1)
const productTableBody = document.getElementById('productTableBody');
const addProductBtn = document.getElementById('addProductBtn');

// DOM Elements - Order Stats (Tab 2)
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const downloadProductExcelBtn = document.getElementById('downloadProductExcelBtn');
let globalOrders = []; // 엑셀 다운로드를 위해 데이터를 캐싱하는 변수
let globalProducts = []; // 제품 엑셀 다운로드를 위한 캐시

// Product Modal Elements
const modalOverlay = document.getElementById('productModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveProductBtn = document.getElementById('saveProductBtn');
const saveMsg = document.getElementById('saveMsg');
const modalTitle = document.getElementById('modalTitle');

const productIdInput = document.getElementById('productId');
const productNameInput = document.getElementById('productName');
const productCategoryInput = document.getElementById('productCategory');
const productPriceInput = document.getElementById('productPrice');
const productStockInput = document.getElementById('productStock');
const productDescInput = document.getElementById('productDesc');
const productImageFile = document.getElementById('productImageFile');
const productImageUrl = document.getElementById('productImageUrl');
const imagePreview = document.getElementById('imagePreview');

// Inventory Modal Elements
const inventoryModal = document.getElementById('inventoryModal');
const closeInventoryModalBtn = document.getElementById('closeInventoryModalBtn');
const cancelInventoryModalBtn = document.getElementById('cancelInventoryModalBtn');
const saveInventoryBtn = document.getElementById('saveInventoryBtn');
const openInventoryModalBtn = document.getElementById('openInventoryModalBtn');
const inventoryCurrentStockInput = document.getElementById('inventoryCurrentStock');
const inventoryChangeAmountInput = document.getElementById('inventoryChangeAmount');
const inventoryManagerNameInput = document.getElementById('inventoryManagerName');
const inventoryReasonInput = document.getElementById('inventoryReason');
const saveInventoryMsg = document.getElementById('saveInventoryMsg');
const inventoryFileInput = document.getElementById('inventoryFile');

// DOM Elements - Banner Management (Tab 4)
const bannerTableBody = document.getElementById('bannerTableBody');
const addBannerBtn = document.getElementById('addBannerBtn');

// Banner Modal Elements
const bannerModalOverlay = document.getElementById('bannerModal');
const closeBannerModalBtn = document.getElementById('closeBannerModalBtn');
const cancelBannerModalBtn = document.getElementById('cancelBannerModalBtn');
const saveBannerBtn = document.getElementById('saveBannerBtn');
const saveBannerMsg = document.getElementById('saveBannerMsg');
const bannerModalTitle = document.getElementById('bannerModalTitle');

const bannerIdInput = document.getElementById('bannerId');
const bannerTypeInput = document.getElementById('bannerType');
const bannerIsActiveInput = document.getElementById('bannerIsActive');
const bannerLinkUrlInput = document.getElementById('bannerLinkUrl');
const bannerImageFile = document.getElementById('bannerImageFile');
const bannerImageUrl = document.getElementById('bannerImageUrl');
const bannerImagePreview = document.getElementById('bannerImagePreview');
const bannerDisplayOrderInput = document.getElementById('bannerDisplayOrder');
 
// User Management Modal Elements
const userModal = document.getElementById('userModal');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const cancelUserModalBtn = document.getElementById('cancelUserModalBtn');
const saveUserBtn = document.getElementById('saveUserBtn');
const saveUserMsg = document.getElementById('saveUserMsg');
const userModalTitle = document.getElementById('userModalTitle');
const addUserBtn = document.getElementById('addUserBtn');

const editUserIdInput = document.getElementById('editUserId');
const userInstitutionInput = document.getElementById('userInstitution');
const userManagerInput = document.getElementById('userManager');
const userPhoneInput = document.getElementById('userPhone');
const userEmailInput = document.getElementById('userEmail');
const userDiscountInput = document.getElementById('userDiscount');
const userMemoInput = document.getElementById('userMemo');

// Category Management Modal Elements
const categoryModal = document.getElementById('categoryModal');
const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
const cancelCategoryModalBtn = document.getElementById('cancelCategoryModalBtn');
const saveCategoryEditBtn = document.getElementById('saveCategoryEditBtn');
const editCatTarget = document.getElementById('editCatTarget');
const editCatMKey = document.getElementById('editCatMKey');
const editCatMidKey = document.getElementById('editCatMidKey');
const editCatSubId = document.getElementById('editCatSubId');
const editCatLabel = document.getElementById('editCatLabel');
const editCatOrder = document.getElementById('editCatOrder');
const editCatIcon = document.getElementById('editCatIcon');
const majorIconGroup = document.getElementById('majorIconGroup');
const categoryModalTitle = document.getElementById('categoryModalTitle');

// ==========================================
// 1. 로그인 / 세션 관리
// ==========================================
async function checkSession() {
    const { data: { session }, error } = await db.auth.getSession();
    if (session) {
        if (session.user && !session.user.email_confirmed_at) {
            console.log('Unconfirmed email admin session detected, signing out...');
            await db.auth.signOut();
            loginOverlay.style.display = 'flex';
            return;
        }
        loginOverlay.style.display = 'none';
        await fetchCategories(); // 카테고리 로드 추가
        initDashboard(); // 로그인 성공 시 대시보드 강제 초기화
    } else {
        loginOverlay.style.display = 'flex';
    }
}

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;
    
    if(!email || !password) {
        loginMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
        return;
    }

    loginBtn.textContent = '로그인 중...';
    loginBtn.disabled = true;

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('confirm your email') || error.message.includes('confirmed')) {
            loginMessage.textContent = '이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해 주세요.';
        } else {
            loginMessage.textContent = '로그인 실패: ' + error.message;
        }
        loginBtn.textContent = '로그인';
        loginBtn.disabled = false;
    } else {
        if (data.user && !data.user.email_confirmed_at) {
            await db.auth.signOut();
            loginMessage.textContent = '이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해 주세요.';
            loginBtn.textContent = '로그인';
            loginBtn.disabled = false;
            return;
        }
        loginOverlay.style.display = 'none';
        emailInput.value = '';
        passInput.value = '';
        // [FIX] 로그인 시에도 카테고리 정보 로드 보장
        await fetchCategories();
        initDashboard();
    }
});

logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut();
    location.reload(); // 깔끔하게 화면 전체 새로고침
});

// ==========================================
// 2. 탭(메뉴) 전환 제어
// ==========================================
window.switchAdminTab = function(targetId, pushState = true) {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navItems.forEach(nav => nav.classList.remove('active'));
    tabPanes.forEach(tab => tab.classList.remove('active'));

    const activeNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    const targetPane = document.getElementById(targetId);
    if (targetPane) {
        targetPane.classList.add('active');
    }

    // 해당 탭 접속 시 데이터 로드
    if(targetId === 'tab-products') {
        if (typeof fetchProducts === 'function') fetchProducts();
    } else if(targetId === 'tab-orders') {
        if (typeof fetchOrders === 'function') fetchOrders();
    } else if(targetId === 'tab-inquiries') {
        if (typeof fetchInquiries === 'function') fetchInquiries();
    } else if(targetId === 'tab-banners') {
        if (typeof switchBannerSubTab === 'function') switchBannerSubTab('banner');
    } else if(targetId === 'tab-users') {
        if (typeof switchUserSubTab === 'function') switchUserSubTab('institution');
    } else if(targetId === 'tab-page-manage') {
        if (typeof initPageManageTab === 'function') initPageManageTab();
    } else if(targetId === 'tab-category-display') {
        if (typeof initCategoryDisplayTab === 'function') initCategoryDisplayTab();
    } else if(targetId === 'tab-category-manage') {
        if (typeof initCategoryManageTab === 'function') initCategoryManageTab();
    } else if(targetId === 'tab-inventory-logs') {
        if (typeof fetchAllInventoryLogs === 'function') fetchAllInventoryLogs();
    } else if(targetId === 'tab-phone-orders') {
        if (typeof fetchPhoneOrders === 'function') fetchPhoneOrders();
    }

    if (pushState) {
        if (!history.state || history.state.tab !== targetId) {
            history.pushState({ tab: targetId }, '', `#${targetId}`);
            window.adminHistoryPushedCount++;
        }
    }
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        switchAdminTab(targetId);
    });
});

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tab) {
        switchAdminTab(e.state.tab, false);
    } else {
        const hashTab = window.location.hash ? window.location.hash.substring(1) : 'tab-products';
        switchAdminTab(hashTab, false);
    }
});

function initDashboard() {
    // 최초 접속 시 제품 관리 탭 로드 (또는 URL에 정의된 해시 탭 로드)
    const initialTab = window.location.hash ? window.location.hash.substring(1) : 'tab-products';
    switchAdminTab(initialTab, true);
    
    // [신규] 새로운 문의사항이 있는지 미리 확인하여 뱃지 표시
    checkNewInquiries();

    // [신규] 실시간 리스너 설정
    setupRealtimeListeners();
}

// ==========================================
// 3. (기존) 제품 목록 로드 / CRUD 
// ==========================================
let globalDisplayConfigs = {};

// 가격 표시 포맷팅 헬퍼 함수
function formatPriceDisplay(price) {
    if (!price) return '0원';
    const clean = price.toString().replace(/,/g, '').trim();
    if (/^\d+$/.test(clean)) {
        return Number(clean).toLocaleString('ko-KR') + '원';
    }
    return price;
}

// [신규] 입력창용 가격 포맷팅 헬퍼 함수
function formatPriceInput(price) {
    if (!price) return '';
    const clean = price.toString().replace(/,/g, '').trim();
    if (/^\d+$/.test(clean)) {
        return Number(clean).toLocaleString('ko-KR');
    }
    return price;
}

// 카테고리별 전시 설정 키(configKey) 파싱 헬퍼 함수
function getProductConfigKey(p) {
    if (!p) return null;
    if (p.category === 'best_product') {
        return 'display_best_product';
    }
    for (const mKey in SITE_CATEGORIES) {
        const major = SITE_CATEGORIES[mKey];
        if (!major || !major.middles) continue;

        for (const midKey in major.middles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            const sub = middle.subs.find(s => s.id === p.category);
            if (sub) {
                return `display_${midKey}-${sub.id}`;
            }
        }
    }
    return null;
}

// 카테고리 전시 경로 라벨 헬퍼 함수
function getProductCategoryPath(p) {
    if (!p) return '';
    if (p.category === 'best_product') {
        return '★ 베스트 상품';
    }
    for (const mKey in SITE_CATEGORIES) {
        const major = SITE_CATEGORIES[mKey];
        if (!major || !major.middles) continue;

        for (const midKey in major.middles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            const sub = middle.subs.find(s => s.id === p.category);
            if (sub) {
                return `${major.label} > ${middle.label} > ${sub.label}`;
            }
        }
    }
    return p.category || '';
}

async function fetchDisplayConfigs() {
    const { data, error } = await db.from('site_configs').select('key, value').like('key', 'display_%');
    globalDisplayConfigs = {};
    if (!error && data) {
        data.forEach(row => {
            globalDisplayConfigs[row.key] = Array.isArray(row.value) ? row.value : [];
        });
    }
}

async function fetchProducts(isSilent = false) {
    if (!isSilent) {
        productTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">데이터를 불러오는 중입니다...</td></tr>';
    }
    
    await fetchDisplayConfigs(); // 전시 설정 로드
    
    const { data: products, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching products:', error);
        productTableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> 오류: ${error.message}</td></tr>`;
        return;
    }

    globalProducts = products || [];
    if (typeof window.applyProductFilters === 'function') {
        window.applyProductFilters();
    } else {
        renderProductTable(globalProducts);
    }
    updateProductRelatedUI(globalProducts);
}

// 제품 테이블 렌더링 함수 (검색 필터링 대응)
function renderProductTable(products) {
    // 스크롤 위치 저장
    const mainContent = document.querySelector('.main-content');
    const mainScroll = mainContent ? mainContent.scrollTop : 0;
    const windowScroll = window.scrollY;

    if (products.length === 0) {
        productTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">등록된 제품이 없거나 검색 결과가 없습니다.</td></tr>';
        // 스크롤 위치 복구
        if (mainContent) mainContent.scrollTop = mainScroll;
        window.scrollTo(0, windowScroll);
        return;
    }

    productTableBody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.image_url ? `<img src="${p.image_url}" class="td-img" alt="${p.name}">` : `<div class="td-img" style="background:#eee; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.8rem;">NO IMG</div>`;
        const dateStr = new Date(p.created_at).toLocaleDateString('ko-KR');

        // 카테고리 라벨 매핑 및 전시 설정 키(configKey) 구하기
        const displayCategory = getProductCategoryPath(p);
        const configKey = getProductConfigKey(p);

        const isDisplayed = configKey && globalDisplayConfigs[configKey] && globalDisplayConfigs[configKey].includes(p.id);
        const orderIndex = isDisplayed ? globalDisplayConfigs[configKey].indexOf(p.id) + 1 : '';
        const orderInputHtml = isDisplayed ? `
            <div style="margin-top:6px; display:flex; align-items:center; justify-content:center; gap:4px;">
                <span style="font-size:0.75rem; color:#666; font-weight:600;">순서:</span>
                <input type="number" value="${orderIndex}" min="1" max="${globalDisplayConfigs[configKey].length}" style="width:48px; height:20px; text-align:center; font-size:0.8rem; border:1px solid #ccc; border-radius:3px; outline:none; font-family:'Malgun Gothic','맑은 고딕',sans-serif;" onchange="changeProductDisplayOrder('${p.id}', '${configKey}', this.value, this)">
            </div>
        ` : '';

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="font-weight:600;"><a href="#" onclick="event.preventDefault(); openPageManage('${p.id}')" style="color:#2980b9; text-decoration:underline; cursor:pointer;" title="상세페이지 관리">${p.name}</a></td>
            <td><span style="background:#eaf2f8; color:#2980b9; padding:3px 8px; border-radius:3px; font-size:0.8rem;">${displayCategory}</span></td>
            <td>${formatPriceDisplay(p.price)}</td>
            <td>${p.stock}개</td>
            <td style="color:#666; font-size:0.9rem;">${dateStr}</td>
            <td style="text-align:center; vertical-align:middle;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px; justify-content:center; margin-bottom: 2px;">
                    <input type="checkbox" style="transform:scale(1.2);" onchange="toggleProductDisplay('${p.id}', '${configKey}', this.checked)" ${isDisplayed ? 'checked' : ''}>
                    <span style="font-size:0.85rem; font-weight:600;">전시</span>
                </label>
                ${orderInputHtml}
            </td>
            <td>
                <button class="action-btn edit" onclick="editProduct('${p.id}')" title="수정"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteProduct('${p.id}', '${p.name}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        productTableBody.appendChild(tr);
    });

    // 스크롤 위치 복구
    if (mainContent) mainContent.scrollTop = mainScroll;
    window.scrollTo(0, windowScroll);
}

// 제품 데이터와 연동된 기타 UI 요소들 업데이트
function updateProductRelatedUI(products) {
    // [개선] 상세페이지 관리 탭의 초기화 및 필터 상태 반영
    renderPageManageProducts();

    // [복구] '카테고리 전시 관리' 탭의 체크박스 그리드 동적 업데이트
    const displayCheckboxGrid = document.getElementById('productCheckboxGrid');
    if (displayCheckboxGrid) {
        if (products.length > 0) {
            displayCheckboxGrid.innerHTML = products.map(p => {
                const displayCategory = getProductCategoryPath(p);

                return `
                <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; transition:background 0.2s;">
                    <input type="checkbox" class="display-item-cb" id="cb_${p.id}" value="${p.id}" style="transform:scale(1.3); margin-right:5px;">
                    <div style="font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">
                        <span style="color:#2980b9; font-size:0.75rem; font-weight:bold;">[${displayCategory}]</span><br>
                        ${p.name}
                    </div>
                </label>
                `;
            }).join('');
            
            // 체크박스 클릭(체인지) 이벤트 리스너 결합
            displayCheckboxGrid.querySelectorAll('.display-item-cb').forEach(cb => {
                cb.addEventListener('change', () => {
                    updateProductSortListFromCheckbox(cb);
                });
            });
            
            // 카테고리 전시 관리 탭이 활성화된 상태이고 현재 선택된 소분류가 있다면 체크박스 상태 갱신
            if(document.getElementById('tab-category-display').classList.contains('active') && typeof currentSelectedSection !== 'undefined' && currentSelectedSection) {
                loadCategoryDisplay(currentSelectedSection);
            }
        } else {
            displayCheckboxGrid.innerHTML = '<div style="color:#999;">등록된 제품이 없습니다.</div>';
        }
    }
}

// [신규] 체크박스 상태에 따라 정렬 목록 동적 업데이트
function updateProductSortListFromCheckbox(cb) {
    const sortList = document.getElementById('productSortList');
    if (!sortList) return;
    
    // placeholder 텍스트 제거
    const placeholder = sortList.querySelector('div[style*="color:#999"]');
    if (placeholder) {
        sortList.innerHTML = '';
    }
    
    const productId = cb.value;
    const labelWrapper = cb.closest('label');
    const productName = labelWrapper ? labelWrapper.querySelector('div').innerText.split('\n').pop().trim() : '알 수 없는 상품';
    
    if (cb.checked) {
        if (sortList.querySelector(`.sort-item[data-id="${productId}"]`)) return;
        
        const sortItem = document.createElement('div');
        sortItem.className = 'sort-item';
        sortItem.dataset.id = productId;
        sortItem.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:6px; cursor:grab; box-shadow:0 2px 5px rgba(0,0,0,0.02);";
        sortItem.innerHTML = `
            <i class="fa-solid fa-grip-vertical drag-handle" style="color:#aaa; cursor:grab;"></i>
            <span style="font-size:0.95rem; font-weight:600; color:#333; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${productName}</span>
            <button class="sort-remove-btn" type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removeProductFromSortList('${productId}')"><i class="fa-solid fa-xmark"></i></button>
        `;
        sortList.appendChild(sortItem);
    } else {
        const existingItem = sortList.querySelector(`.sort-item[data-id="${productId}"]`);
        if (existingItem) {
            existingItem.remove();
        }
    }
    
    // 리스트가 비어있으면 안내문 재노출
    if (sortList.children.length === 0) {
        sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">왼쪽에서 상품을 선택하면 여기에 표시됩니다.</div>';
    }
    
    // SortableJS 바인딩 갱신
    if (typeof Sortable !== 'undefined') {
        Sortable.create(sortList, {
            handle: '.drag-handle',
            animation: 150
        });
    }
}

// [신규] 정렬 목록에서 제거 버튼 클릭 시 연계 동작
window.removeProductFromSortList = (productId) => {
    const cb = document.getElementById(`cb_${productId}`) || document.querySelector(`.display-item-cb[value="${productId}"]`);
    if (cb) {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
    } else {
        const sortList = document.getElementById('productSortList');
        const existingItem = sortList ? sortList.querySelector(`.sort-item[data-id="${productId}"]`) : null;
        if (existingItem) {
            existingItem.remove();
            if (sortList && sortList.children.length === 0) {
                sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">왼쪽에서 상품을 선택하면 여기에 표시됩니다.</div>';
            }
        }
    }
};

function renderPageManageProducts() {
    const targetSelect = document.getElementById('targetPageId');
    if (!targetSelect) return;

    const majorVal = document.getElementById('pageMajorFilter')?.value || 'all';
    const middleVal = document.getElementById('pageMiddleFilter')?.value || 'all';
    const subVal = document.getElementById('pageSubFilter')?.value || 'all';

    let filtered = globalProducts;

    if (majorVal !== 'all' || middleVal !== 'all' || subVal !== 'all') {
        filtered = globalProducts.filter(p => {
            const pCat = p.category || '';
            if (subVal !== 'all') return pCat === subVal;
            if (middleVal !== 'all') {
                for (const mKey in SITE_CATEGORIES) {
                    const middle = SITE_CATEGORIES[mKey].middles[middleVal];
                    if (middle && middle.subs.some(s => s.id === pCat)) return true;
                }
                return false;
            }
            if (majorVal !== 'all') {
                const major = SITE_CATEGORIES[majorVal];
                if (major) {
                    for (const midKey in major.middles) {
                        if (major.middles[midKey].subs.some(s => s.id === pCat)) return true;
                    }
                }
                return false;
            }
            return true;
        });
    }

    if (filtered.length > 0) {
        targetSelect.innerHTML = filtered.map(p => {
            let displayCategory = p.category;
            for (const mKey in SITE_CATEGORIES) {
                const major = SITE_CATEGORIES[mKey];
                if (!major || !major.middles) continue;

                for (const midKey in major.middles) {
                    const middle = major.middles[midKey];
                    if (!middle || !Array.isArray(middle.subs)) continue;

                    const sub = middle.subs.find(s => s.id === p.category);
                    if (sub) {
                        displayCategory = `${major.label} > ${middle.label} > ${sub.label}`;
                        break;
                    }
                }
                if (displayCategory !== p.category) break;
            }
            if (p.category === 'best_product') displayCategory = '★ 베스트 상품';

            return `<option value="${p.id}">${p.name} [${displayCategory}]</option>`;
        }).join('');
        if (document.getElementById('tab-page-manage').classList.contains('active')) {
            targetSelect.dispatchEvent(new Event('change'));
        }
    } else {
        targetSelect.innerHTML = '<option value="">조건에 맞는 제품이 없습니다.</option>';
    }
}

function old_updateProductRelatedUI(products) {
    const targetSelect = document.getElementById('targetPageId');
    if (targetSelect) {
        if (products.length > 0) {
            targetSelect.innerHTML = products.map(p => 
                `<option value="${p.id}">${p.name} (${p.category})</option>`
            ).join('');
            
            // 만약 '상세페이지 관리' 탭이 활성화되어 있다면 즉시 이벤트 발생시켜 데이터 로드
            if(document.getElementById('tab-page-manage').classList.contains('active')) {
                const event = new Event('change');
                targetSelect.dispatchEvent(event);
            }
        } else {
            targetSelect.innerHTML = '<option value="">등록된 제품이 없습니다. 먼저 제품을 등록하세요.</option>';
        }
    }

    // [신규] '카테고리 전시 관리' 탭의 체크박스 그리드 동적 업데이트
    const displayCheckboxGrid = document.getElementById('productCheckboxGrid');
    if (displayCheckboxGrid) {
        if (products.length > 0) {
            displayCheckboxGrid.innerHTML = products.map(p => `
                <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; transition:background 0.2s;">
                    <input type="checkbox" class="display-item-cb" value="${p.id}" style="transform:scale(1.3); margin-right:5px;">
                    <div style="font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">
                        <span style="color:#2980b9; font-size:0.75rem; font-weight:bold;">[${p.category}]</span><br>
                        ${p.name}
                    </div>
                </label>
            `).join('');
            
            // 카테고리 전시 관리 탭이 활성화된 상태라면 체크박스 상태 갱신
            if(document.getElementById('tab-category-display').classList.contains('active')) {
                const secSelect = document.getElementById('targetDisplaySection');
                if(secSelect) secSelect.dispatchEvent(new Event('change'));
            }
        } else {
            displayCheckboxGrid.innerHTML = '<div style="color:#999;">등록된 제품이 없습니다.</div>';
        }
    }
}

// 제품 재고 엑셀 다운로드 함수
function downloadProductExcel() {
    if (globalProducts.length === 0) {
        alert('다운로드할 제품 데이터가 없습니다.');
        return;
    }

    // 엑셀에 들어갈 데이터 정리
    const data = globalProducts.map(p => ({
        '제품ID': p.id,
        '제품명': p.name,
        '카테고리': p.category,
        '판매가격': p.price,
        '현재고량': (p.stock || 0) + '개',
        '등록일시': new Date(p.created_at).toLocaleString('ko-KR')
    }));

    // SheetJS를 사용하여 엑셀 생성
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "재고현황");

    // 컬럼 너비 조정
    const wscols = [
        {wch: 20}, // ID
        {wch: 35}, // 제품명
        {wch: 20}, // 카테고리
        {wch: 15}, // 가격
        {wch: 10}, // 재고
        {wch: 25}  // 등록일
    ];
    worksheet['!cols'] = wscols;

    // 파일 내보내기
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SG_LIMU_재고현황_${dateStr}.xlsx`);
}

// 이벤트 리스너 등록
if(downloadProductExcelBtn) {
    downloadProductExcelBtn.addEventListener('click', downloadProductExcel);
}

// 색상 입력 필드 동적 생성 함수
function createColorRow(val = '') {
    const container = document.getElementById('colorContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'color-row';
    div.style.cssText = "display:flex; align-items:center; gap:5px; background:#fff; padding:5px 10px; border:1px solid #ddd; border-radius:20px;";
    
    // 명칭:금액 분리 파싱
    const parts = val.split(':');
    const name = parts[0] || '';
    const price = parts[1] || '0';

    div.innerHTML = `
        <input type="text" value="${name}" placeholder="색상명" style="border:none; outline:none; font-size:0.9rem; width:80px;">
        <span style="color:#eee">|</span>
        <input type="text" value="${formatPriceInput(price)}" placeholder="추가금" style="border:none; outline:none; font-size:0.9rem; width:60px;" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')">
        <i class="fa-solid fa-xmark" style="cursor:pointer; color:#999; font-size:0.8rem;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(div);
}

// 색상 추가 버튼 이벤트 리스너
const addColorBtn = document.getElementById('addColorBtn');
if (addColorBtn) {
    addColorBtn.addEventListener('click', () => createColorRow(''));
}

// 사이즈 입력 필드 동적 생성 함수
function createSizeRow(val = '') {
    const container = document.getElementById('sizeContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'size-row';
    div.style.cssText = "display:flex; align-items:center; gap:5px; background:#fff; padding:5px 10px; border:1px solid #ddd; border-radius:20px;";
    
    // 명칭:금액 분리 파싱
    const parts = val.split(':');
    const name = parts[0] || '';
    const price = parts[1] || '0';

    div.innerHTML = `
        <input type="text" value="${name}" placeholder="사이즈명" style="border:none; outline:none; font-size:0.9rem; width:80px;">
        <span style="color:#eee">|</span>
        <input type="text" value="${formatPriceInput(price)}" placeholder="추가금" style="border:none; outline:none; font-size:0.9rem; width:60px;" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')">
        <i class="fa-solid fa-xmark" style="cursor:pointer; color:#999; font-size:0.8rem;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(div);
}

// 사이즈 추가 버튼 이벤트 리스너
const addSizeBtn = document.getElementById('addSizeBtn');
if (addSizeBtn) {
    addSizeBtn.addEventListener('click', () => createSizeRow(''));
}

// 모달 및 제품 CRUD 로직은 그대로 복원
function openModal(isEdit = false) {
    updateProductModalDropdown(); // 드롭다운 갱신
    if (!isEdit) {
        modalTitle.textContent = '새 제품 등록';
        productIdInput.value = ''; productNameInput.value = ''; productPriceInput.value = '전화문의';
        productStockInput.value = '0'; productDescInput.value = ''; productImageUrl.value = ''; productImageFile.value = '';
        imagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
        const colorContainer = document.getElementById('colorContainer');
        if(colorContainer) colorContainer.innerHTML = ''; // 색상 초기화
        const sizeContainer = document.getElementById('sizeContainer');
        if(sizeContainer) sizeContainer.innerHTML = ''; // 사이즈 초기화
        const shortCommentInput = document.getElementById('productShortComment');
        if(shortCommentInput) shortCommentInput.value = ''; // 한줄 코멘트 초기화
        if (openInventoryModalBtn) openInventoryModalBtn.style.display = 'none';
        const logSection = document.getElementById('inventoryLogSection');
        if (logSection) logSection.style.display = 'none';
    } else {
        modalTitle.textContent = '제품 정보 수정';
        if (openInventoryModalBtn) openInventoryModalBtn.style.display = 'inline-block';
        const logSection = document.getElementById('inventoryLogSection');
        if (logSection) logSection.style.display = 'block';
    }
    saveMsg.textContent = ''; saveProductBtn.disabled = false; saveProductBtn.textContent = '저장하기';
    modalOverlay.style.display = 'flex';
}
function closeModal() { modalOverlay.style.display = 'none'; }
addProductBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

// 재고 모달 로직
if (openInventoryModalBtn) {
    openInventoryModalBtn.addEventListener('click', () => {
        if (!productIdInput.value) return;
        inventoryCurrentStockInput.value = productStockInput.value || 0;
        inventoryChangeAmountInput.value = '';
        inventoryManagerNameInput.value = '';
        inventoryReasonInput.value = '';
        if (inventoryFileInput) inventoryFileInput.value = '';
        saveInventoryMsg.textContent = '';
        inventoryModal.style.display = 'flex';
    });
}
if (closeInventoryModalBtn) closeInventoryModalBtn.addEventListener('click', () => inventoryModal.style.display = 'none');
if (cancelInventoryModalBtn) cancelInventoryModalBtn.addEventListener('click', () => inventoryModal.style.display = 'none');

if (saveInventoryBtn) {
    saveInventoryBtn.addEventListener('click', async () => {
        const changeAmount = parseInt(inventoryChangeAmountInput.value);
        const managerName = inventoryManagerNameInput.value.trim();
        const prodName = productNameInput ? productNameInput.value.trim() : '알 수 없는 상품';
        const pid = productIdInput.value;

        if (!pid) return;
        if (isNaN(changeAmount) || changeAmount === 0) {
            saveInventoryMsg.textContent = '증감 수량을 올바르게 입력해주세요.'; return;
        }
        if (!managerName) {
            saveInventoryMsg.textContent = '담당자 성함을 반드시 기입해야 합니다.'; return;
        }
        if (!inventoryReasonInput.value.trim()) {
            saveInventoryMsg.textContent = '변동 사유를 기입해주세요.'; return;
        }

        saveInventoryBtn.textContent = '저장 중...';
        saveInventoryBtn.disabled = true;

        let uploadedFileUrl = '';
        const file = inventoryFileInput && inventoryFileInput.files[0];
        if (file) {
            saveInventoryBtn.textContent = '파일 업로드 중...';
            const ext = file.name.split('.').pop();
            const filePath = `log-files/${pid}_${Date.now()}.${ext}`;
            
            const { error: uploadError } = await db.storage.from('product-images').upload(filePath, file);
            if (uploadError) {
                saveInventoryMsg.textContent = '파일 업로드 실패: ' + uploadError.message;
                saveInventoryBtn.textContent = '기록 저장하기';
                saveInventoryBtn.disabled = false;
                return;
            }
            
            const { data: { publicUrl } } = db.storage.from('product-images').getPublicUrl(filePath);
            uploadedFileUrl = publicUrl;
        }

        let reasonStr = `[${prodName}] ${inventoryReasonInput.value.trim()}`;
        if (uploadedFileUrl) {
            reasonStr += `||파일:${uploadedFileUrl}`;
        }

        const { error } = await db.from('inventory_logs').insert([{
            product_id: pid,
            change_amount: changeAmount,
            reason: reasonStr,
            manager_name: managerName
        }]);

        saveInventoryBtn.textContent = '기록 저장하기';
        saveInventoryBtn.disabled = false;

        if (error) {
            saveInventoryMsg.textContent = '오류 발생: ' + error.message;
        } else {
            inventoryModal.style.display = 'none';
            const oldStock = parseInt(productStockInput.value) || 0;
            productStockInput.value = oldStock + changeAmount;
            fetchProducts();
            if (typeof fetchInventoryLogs === 'function') {
                fetchInventoryLogs(pid);
            }
            alert('재고 변동 내역이 성공적으로 기록되었습니다.');
        }
    });
}

async function fetchInventoryLogs(productId) {
    const logTableBody = document.getElementById('inventoryLogTableBody');
    if (!logTableBody) return;

    logTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px; color: #999;">기록을 불러오는 중...</td></tr>';

    const { data: logs, error } = await db
        .from('inventory_logs')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching inventory logs:', error);
        logTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: red;">오류: ${error.message}</td></tr>`;
        return;
    }

    if (!logs || logs.length === 0) {
        logTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px; color: #999;">입출고 변동 기록이 없습니다.</td></tr>';
        return;
    }

    logTableBody.innerHTML = logs.map(log => {
        const dateStr = new Date(log.created_at).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const changeVal = log.change_amount;
        const changeBadge = changeVal > 0 
            ? `<span style="background: #eafaf1; color: #2ecc71; padding: 3px 8px; border-radius: 4px; font-weight: bold;">입고</span>`
            : `<span style="background: #fdf2f2; color: #e74c3c; padding: 3px 8px; border-radius: 4px; font-weight: bold;">출고</span>`;
        const changeColor = changeVal > 0 ? '#2ecc71' : '#e74c3c';
        const changeText = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;
        
        let displayReason = log.reason || '';
        // Remove bracket prefix like [Product Name] for clean display
        displayReason = displayReason.replace(/^\[.*?\]\s*/, '');

        let fileLinkHtml = '';
        if (displayReason.includes('||파일:')) {
            const parts = displayReason.split('||파일:');
            displayReason = parts[0];
            const fileUrl = parts[1];
            fileLinkHtml = `<a href="${fileUrl}" target="_blank" style="color: #2980b9; margin-left: 8px; font-size: 0.95rem;" title="첨부파일 보기"><i class="fa-solid fa-paperclip"></i></a>`;
        }

        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px; color: #666; white-space: nowrap;">${dateStr}</td>
                <td style="padding: 10px;">${changeBadge}</td>
                <td style="padding: 10px; font-weight: bold; color: ${changeColor};">${changeText}개</td>
                <td style="padding: 10px; color: #444;">${log.manager_name || '-'}</td>
                <td style="padding: 10px; color: #555;" title="${displayReason}">${displayReason}${fileLinkHtml}</td>
            </tr>
        `;
    }).join('');
}

let globalInventoryLogs = [];

async function fetchAllInventoryLogs() {
    const tBody = document.getElementById('globalLogTableBody');
    if (!tBody) return;

    tBody.innerHTML = '<tr><td colspan="6" class="empty-state">로그 데이터를 불러오는 중입니다...</td></tr>';

    const { data: logs, error } = await db
        .from('inventory_logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching global inventory logs:', error);
        tBody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> 오류: ${error.message}</td></tr>`;
        return;
    }

    const { data: products } = await db.from('products').select('id, name');
    const productMap = {};
    if (products) {
        products.forEach(p => {
            productMap[p.id] = p.name;
        });
    }

    globalInventoryLogs = (logs || []).map(log => {
        let productName = productMap[log.product_id] || '알 수 없는 상품 (삭제됨)';
        let cleanReason = log.reason || '';
        cleanReason = cleanReason.replace(/^\[.*?\]\s*/, '');

        let fileUrl = '';
        if (cleanReason.includes('||파일:')) {
            const parts = cleanReason.split('||파일:');
            cleanReason = parts[0];
            fileUrl = parts[1];
        }

        return {
            ...log,
            product_name: productName,
            clean_reason: cleanReason,
            file_url: fileUrl
        };
    });

    renderGlobalLogTable(globalInventoryLogs);
}

function renderGlobalLogTable(logs) {
    const tBody = document.getElementById('globalLogTableBody');
    if (!tBody) return;

    if (logs.length === 0) {
        tBody.innerHTML = '<tr><td colspan="6" class="empty-state">기록된 입출고 변동 로그가 없습니다.</td></tr>';
        return;
    }

    tBody.innerHTML = logs.map(log => {
        const dateStr = new Date(log.created_at).toLocaleString('ko-KR');
        const changeVal = log.change_amount;
        const changeBadge = changeVal > 0 
            ? `<span style="background: #eafaf1; color: #2ecc71; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">입고</span>`
            : `<span style="background: #fdf2f2; color: #e74c3c; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">출고</span>`;
        const changeColor = changeVal > 0 ? '#2ecc71' : '#e74c3c';
        const changeText = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;

        const fileLinkHtml = log.file_url 
            ? `<a href="${log.file_url}" target="_blank" style="color: #2980b9; margin-left: 8px; font-size: 0.95rem;" title="첨부파일 보기"><i class="fa-solid fa-paperclip"></i></a>` 
            : '';

        return `
            <tr>
                <td style="color: #666; font-size: 0.9rem; white-space: nowrap;">${dateStr}</td>
                <td style="font-weight: 600; color: var(--admin-sidebar);">${log.product_name}</td>
                <td>${changeBadge}</td>
                <td style="font-weight: bold; color: ${changeColor};">${changeText}개</td>
                <td>${log.manager_name || '-'}</td>
                <td style="color: #555;">${log.clean_reason}${fileLinkHtml}</td>
            </tr>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const logSearchInput = document.getElementById('logSearchInput');
    if (logSearchInput) {
        logSearchInput.addEventListener('input', () => {
            const query = logSearchInput.value.toLowerCase().trim();
            const filtered = globalInventoryLogs.filter(log => {
                return log.product_name.toLowerCase().includes(query) ||
                       (log.manager_name || '').toLowerCase().includes(query) ||
                       (log.clean_reason || '').toLowerCase().includes(query);
            });
            renderGlobalLogTable(filtered);
        });
    }

    const downloadLogExcelBtn = document.getElementById('downloadLogExcelBtn');
    if (downloadLogExcelBtn) {
        downloadLogExcelBtn.addEventListener('click', () => {
            if (globalInventoryLogs.length === 0) {
                alert('다운로드할 로그 데이터가 없습니다.');
                return;
            }

            const data = globalInventoryLogs.map(log => ({
                '변동일시': new Date(log.created_at).toLocaleString('ko-KR'),
                '제품명': log.product_name,
                '구분': log.change_amount > 0 ? '입고' : '출고',
                '변동수량': log.change_amount + '개',
                '담당자': log.manager_name || '',
                '변동사유': log.clean_reason || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "입출고로그");

            const wscols = [
                {wch: 25}, // 일시
                {wch: 35}, // 제품명
                {wch: 10}, // 구분
                {wch: 12}, // 수량
                {wch: 15}, // 담당자
                {wch: 40}  // 사유
            ];
            worksheet['!cols'] = wscols;

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `SG_LIMU_입출고로그_${dateStr}.xlsx`);
        });
    }
});

productImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
        reader.readAsDataURL(file);
    }
});

saveProductBtn.addEventListener('click', async () => {
    const shortCommentInput = document.getElementById('productShortComment');
    const payload = {
        name: productNameInput.value.trim(), category: productCategoryInput.value,
        price: productPriceInput.value.trim().replace(/,/g, ''), 
        description: productDescInput.value.trim(), image_url: productImageUrl.value,
        short_comment: shortCommentInput ? shortCommentInput.value.trim() : '',
        colors: Array.from(document.querySelectorAll('#colorContainer .color-row')).map(row => {
            const inps = row.querySelectorAll('input');
            const name = inps[0].value.trim();
            const price = inps[1].value.trim().replace(/,/g, '') || '0';
            return name ? `${name}:${price}` : null;
        }).filter(v => v).join(','),
        sizes: Array.from(document.querySelectorAll('#sizeContainer .size-row')).map(row => {
            const inps = row.querySelectorAll('input');
            const name = inps[0].value.trim();
            const price = inps[1].value.trim().replace(/,/g, '') || '0';
            return name ? `${name}:${price}` : null;
        }).filter(v => v).join(',')
    };
    if (!payload.name) { saveMsg.textContent = '제품명은 필수입니다!'; return; }

    saveProductBtn.disabled = true; saveProductBtn.textContent = '저장 중...';
    const file = productImageFile.files[0];

    // 스토리지 업로드
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;
        const { error: uploadError } = await db.storage.from('product-images').upload(filePath, file);
        if (uploadError) { saveMsg.textContent = '업로드 오류: ' + uploadError.message; saveProductBtn.disabled=false; saveProductBtn.textContent='저장하기'; return; }
        const { data: { publicUrl } } = db.storage.from('product-images').getPublicUrl(filePath);
        payload.image_url = publicUrl;
    }

    const id = productIdInput.value;
    
    // [신규] colors/sizes 정보를 description 끝부분에 [[C:...]] [[S:...]] 형식의 태그로 결합
    const finalDescription = `${payload.description}\n\n[[C:${payload.colors}]]\n[[S:${payload.sizes}]]`;
    
    // ── 저장 전략: 3단계 분리 ──────────────────────────────────────
    // 1단계: 반드시 저장해야 하는 핵심 필드 (short_comment 포함)
    const corePayload = {
        name: payload.name,
        category: payload.category,
        price: payload.price,
        description: finalDescription,
        image_url: payload.image_url,
        short_comment: payload.short_comment || ''
    };

    let error = null;
    if (id) {
        // 2단계: colors/sizes 포함해서 먼저 시도
        const { error: updateError } = await db.from('products').update({ ...corePayload, colors: payload.colors, sizes: payload.sizes }).eq('id', id);
        if (updateError && (updateError.message.includes('colors') || updateError.message.includes('sizes'))) {
            // colors/sizes 컬럼이 없으면 핵심 필드만 저장
            console.warn('[폴백] colors/sizes 컬럼 없음 → 핵심 필드만 저장');
            const { error: fallbackError } = await db.from('products').update(corePayload).eq('id', id);
            error = fallbackError;
        } else {
            error = updateError;
        }
    } else {
        // 2단계: colors/sizes 포함해서 먼저 시도
        const { error: insertError } = await db.from('products').insert([{ ...corePayload, colors: payload.colors, sizes: payload.sizes }]);
        if (insertError && (insertError.message.includes('colors') || insertError.message.includes('sizes'))) {
            // colors/sizes 컬럼이 없으면 핵심 필드만 저장
            console.warn('[폴백] colors/sizes 컬럼 없음 → 핵심 필드만 저장');
            const { error: fallbackError } = await db.from('products').insert([corePayload]);
            error = fallbackError;
        } else {
            error = insertError;
        }
    }

    if (error) {
        console.error('[저장 실패 상세]', error);
        saveMsg.textContent = '저장 실패: ' + error.message;
        saveMsg.style.color = 'red';
    } else {
        console.log('[저장 성공] short_comment:', payload.short_comment);
        saveMsg.textContent = '✅ 저장 완료!';
        saveMsg.style.color = 'green';
        // [수정] 제품 카테고리가 변경되었을 수 있으므로 다른 카테고리의 전시 설정에서 제거
        if (id) {
            let configKey = null;
            for (const mKey in SITE_CATEGORIES) {
                const major = SITE_CATEGORIES[mKey];
                if (!major || !major.middles) continue;
                for (const midKey in major.middles) {
                    const middle = major.middles[midKey];
                    if (!middle || !Array.isArray(middle.subs)) continue;
                    if (middle.subs.some(s => s.id === payload.category)) {
                        configKey = `display_${midKey}-${payload.category}`;
                        break;
                    }
                }
                if (configKey) break;
            }
            if (payload.category === 'best_product') configKey = 'display_best_product';

            let wasDisplayedAnywhere = false;
            const upsertPromises = [];
            
            for (const key in globalDisplayConfigs) {
                if (globalDisplayConfigs[key].includes(id)) {
                    if (key !== configKey) {
                        globalDisplayConfigs[key] = globalDisplayConfigs[key].filter(pid => pid !== id);
                        upsertPromises.push(db.from('site_configs').upsert({ key: key, value: globalDisplayConfigs[key] }));
                        wasDisplayedAnywhere = true;
                    } else {
                        wasDisplayedAnywhere = true;
                    }
                }
            }
            
            // 기존에 전시 중이었다면, 새 카테고리에도 자동으로 전시 상태 유지
            if (wasDisplayedAnywhere && configKey) {
                if (!globalDisplayConfigs[configKey]) globalDisplayConfigs[configKey] = [];
                if (!globalDisplayConfigs[configKey].includes(id)) {
                    globalDisplayConfigs[configKey].push(id);
                    upsertPromises.push(db.from('site_configs').upsert({ key: configKey, value: globalDisplayConfigs[configKey] }));
                }
            }
            
            if (upsertPromises.length > 0) {
                await Promise.all(upsertPromises);
            }
        }
        
        setTimeout(() => { closeModal(); fetchProducts(); }, 600);
    }
    
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = '저장하기';
});

window.editProduct = async (id) => {
    const { data: p, error } = await db.from('products').select('*').eq('id', id).single();
    if (error) { alert("데이터 불러오기 실패"); return; }
    openModal(true);
    if (typeof fetchInventoryLogs === 'function') {
        fetchInventoryLogs(id);
    }
    productIdInput.value = p.id; productNameInput.value = p.name; productCategoryInput.value = p.category;
    productPriceInput.value = formatPriceInput(p.price); productStockInput.value = p.stock; 
    
    // 상세 설명 로드 시 색상/사이즈 태그 제거 처리
    productDescInput.value = (p.description || '').replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    
    // 한줄 코멘트 로드
    const shortCommentInput = document.getElementById('productShortComment');
    if (shortCommentInput) shortCommentInput.value = p.short_comment || '';
    
    productImageUrl.value = p.image_url || '';
    imagePreview.innerHTML = p.image_url ? `<img src="${p.image_url}">` : '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
    
    // 색상/사이즈 데이터 로드 (컬럼 우선, 없으면 description에서 파싱)
    const colorContainer = document.getElementById('colorContainer');
    const sizeContainer = document.getElementById('sizeContainer');

    if(colorContainer) {
        colorContainer.innerHTML = '';
        let colorData = p.colors;
        if(!colorData && p.description) {
            const match = p.description.match(/\[\[C:(.*?)\]\]/);
            if(match) colorData = match[1];
        }
        if(colorData) {
            colorData.split(',').forEach(c => createColorRow(c.trim()));
        }
    }

    if(sizeContainer) {
        sizeContainer.innerHTML = '';
        let sizeData = p.sizes;
        if(!sizeData && p.description) {
            const match = p.description.match(/\[\[S:(.*?)\]\]/);
            if(match) sizeData = match[1];
        }
        if(sizeData) {
            sizeData.split(',').forEach(s => createSizeRow(s.trim()));
        }
    }
};

window.deleteProduct = async (id, name) => {
    if(confirm(`"${name}" 제품을 영구 삭제하시겠습니까?`)) {
        const { error } = await db.from('products').delete().eq('id', id);
        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            const upsertPromises = [];
            // 전시 설정에서도 삭제
            for (const key in globalDisplayConfigs) {
                if (globalDisplayConfigs[key].includes(id)) {
                    globalDisplayConfigs[key] = globalDisplayConfigs[key].filter(pid => pid !== id);
                    upsertPromises.push(db.from('site_configs').upsert({ key: key, value: globalDisplayConfigs[key] }));
                }
            }
            if (upsertPromises.length > 0) {
                await Promise.all(upsertPromises);
            }
            fetchProducts();
        }
    }
};

// ==========================================
// 4. [신규] 주문 통계 데이터 로드 및 분석 차트
// ==========================================
let globalOrdersRaw = [];
let currentStatsDateRange = { days: 'all', start: null, end: null };

let orderChartInstance = null;
let revenueChartInstance = null;
let productStatChartInstance = null;
let statusRatioChartInstance = null;

// 필터 버튼 이벤트 설정
document.addEventListener('DOMContentLoaded', () => {
    const presetBtns = document.querySelectorAll('.date-preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presetBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentStatsDateRange.days = e.target.dataset.days;
            // Clear custom dates if preset is used
            const sd = document.getElementById('statsStartDate');
            const ed = document.getElementById('statsEndDate');
            if(sd) sd.value = '';
            if(ed) ed.value = '';
            applyStatsFilter();
        });
    });

    const applyBtn = document.getElementById('applyStatsFilterBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const startVal = document.getElementById('statsStartDate').value;
            const endVal = document.getElementById('statsEndDate').value;
            if (startVal || endVal) {
                currentStatsDateRange.days = 'custom';
                presetBtns.forEach(b => b.classList.remove('active'));
                currentStatsDateRange.start = startVal ? new Date(startVal) : null;
                currentStatsDateRange.end = endVal ? new Date(endVal) : null;
                if (currentStatsDateRange.end) {
                    currentStatsDateRange.end.setHours(23,59,59,999);
                }
            }
            applyStatsFilter();
        });
    }

    const typeSelect = document.getElementById('productStatType');
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            if (globalOrders) renderProductStats(globalOrders);
        });
    }

    const downloadProdBtn = document.getElementById('downloadProductStatsExcelBtn');
    if (downloadProdBtn) {
        downloadProdBtn.addEventListener('click', downloadProductStatsExcel);
    }
});

async function fetchOrders() {
    const tableBody = document.getElementById('orderTableBody');
    if(!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">분석 데이터를 불러오는 중입니다...</td></tr>';
    
    // orders 테이블에서 가져오기
    const { data: orders, error } = await db.from('orders').select('*').order('created_at', { ascending: false });

    if (error) {
        console.warn('Orders Table 에러:', error.message);
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color:var(--danger)">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:10px;"></i><br>
            <b>'orders'</b> 테이블을 불러올 수 없습니다. (${error.message})<br>
            <div style="font-size:0.8rem; background:#f9f9f9; padding:10px; margin-top:10px; text-align:left; border-radius:4px;">
                SQL Editor에서 다음을 실행하세요:<br>
                <code>CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), customer_name text, product_name text, total_price int, status text, created_at timestamp with time zone DEFAULT now());</code>
            </div>
        </td></tr>`;
        return;
    }

    globalOrdersRaw = orders || [];
    applyStatsFilter();
}

function applyStatsFilter() {
    let filtered = [...globalOrdersRaw];
    let start = null;
    let end = null;
    
    if (currentStatsDateRange.days === 'custom') {
        start = currentStatsDateRange.start;
        end = currentStatsDateRange.end;
    } else if (currentStatsDateRange.days !== 'all') {
        const days = parseInt(currentStatsDateRange.days);
        end = new Date();
        end.setHours(23,59,59,999);
        start = new Date();
        start.setHours(0,0,0,0);
        start.setDate(start.getDate() - days);
    }

    if (start) filtered = filtered.filter(o => new Date(o.created_at) >= start);
    if (end) filtered = filtered.filter(o => new Date(o.created_at) <= end);

    globalOrders = filtered; // 엑셀 다운로드용 및 차트용 전역변수
    renderOrdersDashboard(filtered, start, end);
}

function renderOrdersDashboard(orders, filterStart, filterEnd) {
    const tableBody = document.getElementById('orderTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    let totalRevenue = 0;
    let pendingCount = 0;

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">해당 기간의 주문 내역이 없습니다.</td></tr>';
        
        if(document.getElementById('totalOrderCount')) document.getElementById('totalOrderCount').textContent = "0건";
        if(document.getElementById('totalOrderRevenue')) document.getElementById('totalOrderRevenue').textContent = "0원";
        if(document.getElementById('pendingOrderCount')) document.getElementById('pendingOrderCount').textContent = "0건";
        
        renderAnalysisCharts([], null, null);
        renderProductStats([]);
        renderStatusRatio([]);
        return;
    }

    orders.forEach(o => {
        const tr = document.createElement('tr');
        const createdAt = o.created_at ? new Date(o.created_at) : new Date();
        const dateStr = createdAt.toLocaleString('ko-KR');
        
        const status = o.status || 'pending';
        const statusStr = status === 'pending' ? '<span style="color:var(--danger);font-weight:bold;">배송준비</span>' : 
                          status === 'shipped' ? '<span style="color:#3498db;font-weight:bold;">배송진행</span>' : 
                          '<span style="color:var(--success);font-weight:bold;">완료됨</span>';

        const rawPrice = Number(o.total_price) || 0;
        const displayId = o.id ? o.id.toString().substring(0,8).toUpperCase() : 'N/A';

        tr.innerHTML = `
            <td>#${displayId}</td>
            <td style="font-weight:600;">${o.customer_name ? o.customer_name.split('||')[0] : '익명'}</td>
            <td>${o.product_name || '정보없음'}</td>
            <td>${o.quantity || 1}개</td>
            <td style="font-weight:600;">${rawPrice.toLocaleString()}원</td>
            <td>${statusStr}</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td><button class="action-btn" title="주문 관리(준비중)"><i class="fa-solid fa-pen"></i></button></td>
        `;
        tableBody.appendChild(tr);

        totalRevenue += rawPrice;
        if(status === 'pending') pendingCount++;
    });

    if(document.getElementById('totalOrderCount')) document.getElementById('totalOrderCount').textContent = orders.length + "건";
    if(document.getElementById('totalOrderRevenue')) document.getElementById('totalOrderRevenue').textContent = totalRevenue.toLocaleString() + "원";
    if(document.getElementById('pendingOrderCount')) document.getElementById('pendingOrderCount').textContent = pendingCount + "건";

    renderAnalysisCharts(orders, filterStart, filterEnd);
    renderProductStats(orders);
    renderStatusRatio(orders);
}

function renderAnalysisCharts(orders, start, end) {
    const orderCanvas = document.getElementById('orderChart');
    const revenueCanvas = document.getElementById('revenueChart');
    if(!orderCanvas || !revenueCanvas) return;
    
    // 차트 제목 업데이트
    let titlePrefix = "기간별";
    if (currentStatsDateRange.days === '0') titlePrefix = "오늘(시간별)";
    else if (currentStatsDateRange.days === '7') titlePrefix = "최근 7일";
    else if (currentStatsDateRange.days === '30') titlePrefix = "최근 1개월";
    else if (currentStatsDateRange.days === '180') titlePrefix = "최근 6개월(월별)";
    else if (currentStatsDateRange.days === '365') titlePrefix = "최근 1년(월별)";
    else if (currentStatsDateRange.days === 'all') titlePrefix = "전체 기간(연/월별)";
    
    if(document.getElementById('orderChartTitle')) document.getElementById('orderChartTitle').innerHTML = `<i class="fa-solid fa-chart-column"></i> ${titlePrefix} 주문 건수 추이`;
    if(document.getElementById('revenueChartTitle')) document.getElementById('revenueChartTitle').innerHTML = `<i class="fa-solid fa-chart-line"></i> ${titlePrefix} 매출액 추이`;

    // 날짜 그룹핑 판별
    let diffDays = 30; 
    let maxDate = new Date();
    let minDate = new Date();
    
    if (start && end) {
        minDate = start; maxDate = end;
        diffDays = (end - start) / (1000 * 60 * 60 * 24);
    } else if (orders.length > 0) {
        const dates = orders.map(o => new Date(o.created_at).getTime());
        minDate = new Date(Math.min(...dates));
        maxDate = new Date(Math.max(...dates));
        diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    }

    let groupBy = 'day';
    if (diffDays > 365 * 2) groupBy = 'year';
    else if (diffDays > 90) groupBy = 'month';
    if (currentStatsDateRange.days === '0') groupBy = 'hour'; // 오늘은 시간별
    
    // 라벨 및 데이터 초기화 로직
    const labels = [];
    const countData = [];
    const revenueData = [];
    
    const aggregated = {};

    orders.forEach(o => {
        if(!o.created_at) return;
        const d = new Date(o.created_at);
        let key = '';
        
        if (groupBy === 'hour') {
            key = `${d.getHours()}시`;
        } else if (groupBy === 'year') {
            key = `${d.getFullYear()}년`;
        } else if (groupBy === 'month') {
            key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
        } else {
            key = `${d.getMonth()+1}/${d.getDate()}`;
        }
        
        if (!aggregated[key]) aggregated[key] = { count: 0, rev: 0, dateObj: d };
        aggregated[key].count++;
        aggregated[key].rev += Number(o.total_price) || 0;
    });

    // 라벨 정렬
    const sortedKeys = Object.keys(aggregated).sort((a,b) => aggregated[a].dateObj - aggregated[b].dateObj);
    sortedKeys.forEach(k => {
        labels.push(k);
        countData.push(aggregated[k].count);
        revenueData.push(aggregated[k].rev);
    });

    if (labels.length === 0) {
        labels.push('데이터 없음');
        countData.push(0);
        revenueData.push(0);
    }

    // 1. 주문 건수 차트 (막대)
    if(orderChartInstance) orderChartInstance.destroy();
    orderChartInstance = new Chart(orderCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '주문 건수', data: countData,
                backgroundColor: 'rgba(142, 195, 66, 0.8)', borderRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });

    // 2. 매출액 추이 차트 (라인)
    if(revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(revenueCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '매출액 (원)', data: revenueData,
                borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString() + '원' } } },
            plugins: { 
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => c.raw.toLocaleString() + '원' } }
            }
        }
    });
}

function renderProductStats(orders) {
    const statType = document.getElementById('productStatType') ? document.getElementById('productStatType').value : 'quantity';
    
    const prodMap = {};
    orders.forEach(o => {
        const name = o.product_name || '정보없음';
        if (!prodMap[name]) prodMap[name] = { qty: 0, revenue: 0 };
        prodMap[name].qty += (Number(o.quantity) || 1);
        prodMap[name].revenue += (Number(o.total_price) || 0);
    });
    
    const sortedProds = Object.keys(prodMap).map(k => ({ name: k, ...prodMap[k] }))
        .sort((a,b) => statType === 'quantity' ? b.qty - a.qty : b.revenue - a.revenue);
        
    // 테이블 렌더링
    const tBody = document.getElementById('productStatTableBody');
    if (tBody) {
        tBody.innerHTML = '';
        if (sortedProds.length === 0) {
            tBody.innerHTML = '<tr><td colspan="4" class="empty-state">조회된 데이터가 없습니다.</td></tr>';
        } else {
            sortedProds.forEach((p, idx) => {
                tBody.innerHTML += `<tr>
                    <td>${idx+1}</td>
                    <td style="font-weight:bold;">${p.name}</td>
                    <td>${p.qty.toLocaleString()}개</td>
                    <td>${p.revenue.toLocaleString()}원</td>
                </tr>`;
            });
        }
    }

    // Top 5 차트 렌더링
    const top5 = sortedProds.slice(0, 5);
    const canvas = document.getElementById('productStatChart');
    if(!canvas) return;
    if(productStatChartInstance) productStatChartInstance.destroy();
    
    productStatChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: top5.map(p => p.name.length > 15 ? p.name.substring(0,15)+'...' : p.name),
            datasets: [{
                label: statType === 'quantity' ? '판매 수량 (개)' : '매출액 (원)',
                data: top5.map(p => statType === 'quantity' ? p.qty : p.revenue),
                backgroundColor: statType === 'quantity' ? 'rgba(231, 76, 60, 0.8)' : 'rgba(241, 196, 15, 0.8)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => c.raw.toLocaleString() + (statType==='quantity'?'개':'원') } }
            }
        }
    });
}

function renderStatusRatio(orders) {
    const counts = { pending: 0, shipped: 0, completed: 0 };
    orders.forEach(o => {
        counts[o.status || 'pending']++;
    });
    
    const canvas = document.getElementById('statusRatioChart');
    if(!canvas) return;
    if(statusRatioChartInstance) statusRatioChartInstance.destroy();
    
    if (orders.length === 0) {
        // 데이터가 없을 경우
        statusRatioChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'doughnut', data: { labels: ['데이터 없음'], datasets: [{ data: [1], backgroundColor: ['#eee'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { enabled: false } } }
        });
        return;
    }

    statusRatioChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['배송준비', '배송진행', '완료됨'],
            datasets: [{
                data: [counts.pending, counts.shipped, counts.completed],
                backgroundColor: ['#e74c3c', '#3498db', '#2ecc71'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function downloadProductStatsExcel() {
    const tBody = document.getElementById('productStatTableBody');
    if (!tBody || tBody.innerText.includes('조회된 데이터가 없습니다')) {
        alert("다운로드할 데이터가 없습니다.");
        return;
    }
    
    const table = document.getElementById('productStatTable');
    const wb = XLSX.utils.table_to_book(table, {sheet: "상품별 통계"});
    
    let fileName = `상품별_통계_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// SheetJS를 활용한 엑셀 다운로드 트리거
downloadExcelBtn.addEventListener('click', () => {
    if(globalOrders.length === 0) {
        alert("엑셀로 다운로드할 배송 기록/통계 데이터가 하나도 존재하지 않습니다.");
        return;
    }

    // 엑셀 표로 만들 데이터 가공 (한글 컬럼 적용)
    const excelData = globalOrders.map(o => ({
        "접수번호": o.id,
        "고객명/소속": o.customer_name ? o.customer_name.split('||')[0] : "익명",
        "연락처": o.customer_phone || "미입력",
        "주문 상품명": o.product_name,
        "구매 수량": o.quantity,
        "총 결제/청구액": o.total_price,
        "처리 상태": o.status === 'pending' ? '배송준비중' : o.status === 'shipped' ? '배송중' : '처리완료',
        "접수 일자 (KST 기준)": new Date(o.created_at).toLocaleString('ko-KR')
    }));

    // 가상 워크북 및 시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "통계 집계결과(Orders)");
    
    // 파일 다운로드
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SG_LIMU_총주문통계_${todayStr}.xlsx`);
});

// ==========================================
// 5. 기타 제안 기능(견적, 배너, 회원) 더미 로드 함수
// ==========================================
async function fetchInquiries() {
    const tBody = document.getElementById('inquiryTableBody');
    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">고객 문의 데이터를 불러오는 중입니다...</td></tr>';
    
    const { data: inquiries, error } = await db.from('inquiries').select('*').order('created_at', { ascending: false });

    if(error) {
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;"><i class="fa-solid fa-triangle-exclamation"></i> 테이블 구조 불일치 또는 미생성 에러입니다.<br>${error.message}</td></tr>`;
        return;
    }
    
    // [신규] 문의 로드 시 뱃지 업데이트
    const openCount = inquiries.filter(inq => inq.status === 'open').length;
    updateInquiryBadge(openCount);

    if(inquiries.length === 0) {
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state">접수된 견적/상담 문의 내역이 없습니다. (고객의 연락을 기다리는 중)</td></tr>`;
        return;
    }

    tBody.innerHTML = '';
    inquiries.forEach(inq => {
        const tr = document.createElement('tr');
        const dateStr = new Date(inq.created_at).toLocaleString('ko-KR');
        
        let statusBadge = '';
        if(inq.status === 'open') statusBadge = '<span style="background:#e74c3c;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-circle-exclamation"></i> 신규접수</span>';
        else if(inq.status === 'processing') statusBadge = '<span style="background:#f39c12;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-spinner"></i> 확인중</span>';
        else statusBadge = '<span style="background:#2ecc71;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-check"></i> 답변완료</span>';

        tr.innerHTML = `
            <td>#${inq.id}</td>
            <td style="font-weight:600;">${inq.author}</td>
            <td>${inq.phone}</td>
            <td style="text-align:left; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${inq.title}">${inq.title}</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td>${statusBadge}</td>
            <td>
                <select onchange="updateInquiryStatus('${inq.id}', this.value)" style="padding:5px; border-radius:4px; border:1px solid #ccc; font-size:0.9rem;">
                    <option value="open" ${inq.status === 'open' ? 'selected' : ''}>대기중</option>
                    <option value="processing" ${inq.status === 'processing' ? 'selected' : ''}>확인(처리)중</option>
                    <option value="closed" ${inq.status === 'closed' ? 'selected' : ''}>답변완료</option>
                </select>
                <button class="action-btn" style="margin-left:10px; color:#3498db" onclick="alert('👤 고객명/기관: ${inq.author ? inq.author.replace(/'/g, "\\'") : ''}\\n📞 연락처: ${inq.phone || ''}\\n🕒 접수일시: ${dateStr}\\n\\n📋 [문의 및 요청내용]\\n${inq.title ? inq.title.replace(/'/g, "\\'") : ''}')" title="내용 전체보기"><i class="fa-solid fa-envelope-open-text"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

// 문의 상태 (답변완료 등) 변경 저장 함수 (전역)
window.updateInquiryStatus = async function(id, newStatus) {
    const { error } = await db.from('inquiries').update({ status: newStatus }).eq('id', id);
    if (error) {
        alert('상태 변경 중 오류: ' + error.message);
    } else {
        fetchInquiries(); // 화면 자동 재로딩 (뱃지 업데이트도 포함됨)
    }
}

// [신규] 사이드바 문의 알림 뱃지 업데이트 함수
function updateInquiryBadge(count) {
    const badge = document.getElementById('inquiryBadge');
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// [신규] 초기 로드 시 또는 주기적으로 새 문의 확인
async function checkNewInquiries() {
    try {
        const { data, error } = await db.from('inquiries').select('id').eq('status', 'open');
        if (!error && data) {
            updateInquiryBadge(data.length);
        }
    } catch (e) {
        console.warn("New inquiry check failed:", e);
    }
}
// [신규] 실시간 DB 변경 감시 (문의사항 자동 갱신)
function setupRealtimeListeners() {
    if (!db) return;

    // inquiries 테이블의 변경사항을 실시간 감시
    db.channel('inquiries-realtime')
      .on('postgres_changes', { event: '*', table: 'inquiries', schema: 'public' }, (payload) => {
          console.log('Realtime Inquiry Update:', payload);
          // 변경 발생 시 뱃지 자동 갱신
          checkNewInquiries();
          
          // 현재 문의 탭을 보고 있다면 리스트도 자동 갱신
          const activeTab = document.querySelector('.nav-item.active');
          if (activeTab && activeTab.getAttribute('data-target') === 'tab-inquiries') {
              fetchInquiries();
          }
      })
      .subscribe();
}

async function fetchBanners() {
    // banners 테이블에서 데이터 가져오기 (순서 필드 기준 오름차순)
    const { data: banners, error } = await db.from('banners').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false });

    if (error) {
        bannerTableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;">데이터베이스에 'banners' 테이블을 먼저 생성해주세요.<br>${error.message}</td></tr>`;
        return;
    }

    if (banners.length === 0) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">현재 등록된 배너/팝업이 없습니다.</td></tr>';
        return;
    }

    bannerTableBody.innerHTML = '';
    banners.forEach(b => {
        const tr = document.createElement('tr');
        const imgHtml = b.image_url ? `<img src="${b.image_url}" class="td-img" style="width:100px; height:auto; object-fit:contain;" alt="배너 이미지">` : `<div style="color:#999; font-size:0.8rem;">이미지 없음</div>`;
        const typeBadge = b.type === 'slide' ? '<span style="background:#3498db; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8rem;">메인 슬라이드</span>' : '<span style="background:#9b59b6; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8rem;">팝업창</span>';
        
        // 상태 토글 스위치 (활성/비활성)
        const statusHtml = `
            <select onchange="updateBannerStatus('${b.id}', this.value)" style="padding:4px; border-radius:4px; border:1px solid #ccc;">
                <option value="true" ${b.is_active ? 'selected' : ''}>노출 중</option>
                <option value="false" ${!b.is_active ? 'selected' : ''}>숨김</option>
            </select>
        `;
        
        const dateStr = new Date(b.created_at).toLocaleDateString('ko-KR');

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${typeBadge}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><a href="${b.link_url || '#'}" target="_blank" style="color:var(--primary); text-decoration:none;">${b.link_url || '없음'}</a></td>
            <td style="font-weight:bold;">${b.display_order || 0}</td>
            <td>${dateStr}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn delete" onclick="deleteBanner('${b.id}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        bannerTableBody.appendChild(tr);
    });
}

// 상태 즉시 업데이트 함수 (전역)
window.updateBannerStatus = async function(id, isActiveStr) {
    const isActive = isActiveStr === 'true';
    const { error } = await db.from('banners').update({ is_active: isActive }).eq('id', id);
    if(error) alert('상태 변경 오류: ' + error.message);
};

window.deleteBanner = async function(id) {
    if(confirm('이 배너를 영구적으로 삭제하시겠습니까?')) {
        const { error } = await db.from('banners').delete().eq('id', id);
        if(error) alert('삭제 실패: ' + error.message);
        else fetchBanners();
    }
};

// ==========================================
// 6. 배너 모달 제어 및 수정 로직
// ==========================================
function openBannerModal() {
    bannerModalTitle.textContent = '새 배너/팝업 등록';
    bannerIdInput.value = '';
    bannerTypeInput.value = 'slide';
    bannerIsActiveInput.value = 'true';
    bannerLinkUrlInput.value = '';
    bannerDisplayOrderInput.value = '0';
    bannerImageUrl.value = '';
    bannerImageFile.value = '';
    bannerImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
    
    saveBannerMsg.textContent = '';
    saveBannerBtn.disabled = false;
    saveBannerBtn.textContent = '저장하기';
    
    bannerModalOverlay.style.display = 'flex';
}

function closeBannerModal() { bannerModalOverlay.style.display = 'none'; }

if (addBannerBtn) addBannerBtn.addEventListener('click', openBannerModal);
if (closeBannerModalBtn) closeBannerModalBtn.addEventListener('click', closeBannerModal);
if (cancelBannerModalBtn) cancelBannerModalBtn.addEventListener('click', closeBannerModal);

bannerImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { bannerImagePreview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;" alt="Preview">`; };
        reader.readAsDataURL(file);
    }
});

saveBannerBtn.addEventListener('click', async () => {
    const file = bannerImageFile.files[0];
    const bType = bannerTypeInput.value;
    const isActive = bannerIsActiveInput.value === 'true';
    const linkUrl = bannerLinkUrlInput.value.trim();
    const displayOrder = parseInt(bannerDisplayOrderInput.value) || 0;
    
    // 새 배너 등록 시 이미지는 필수
    if(!file && !bannerImageUrl.value) {
        saveBannerMsg.textContent = '배너 이미지를 첨부해주세요.';
        return;
    }

    saveBannerBtn.disabled = true;
    saveBannerBtn.textContent = '저장 중...';

    const payload = {
        type: bType,
        is_active: isActive,
        link_url: linkUrl || null,
        display_order: displayOrder
    };

    // 이미지 파일 업로드 로직 (bucket명: banner-images)
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `banners/${fileName}`; // 폴더 지정 선택적
        
        const { error: uploadError } = await db.storage.from('banner-images').upload(filePath, file);
        
        if (uploadError) { 
            saveBannerMsg.textContent = '이미지 업로드 오류: ' + uploadError.message; 
            saveBannerBtn.disabled = false; 
            saveBannerBtn.textContent = '저장하기'; 
            return; 
        }
        
        const { data: { publicUrl } } = db.storage.from('banner-images').getPublicUrl(filePath);
        payload.image_url = publicUrl;
    } else {
        payload.image_url = bannerImageUrl.value;
    }

    // Insert
    const { error } = await db.from('banners').insert([payload]);
    
    if (error) {
        saveBannerMsg.textContent = '등록 실패: ' + error.message;
        saveBannerBtn.disabled = false; 
        saveBannerBtn.textContent = '저장하기';
    } else {
        closeBannerModal();
        fetchBanners();
    }
});
// ------------------------------------------
// 7. [신규] 배너/팝업 관리 내 서브 탭 및 베스트 상품 관리
// ------------------------------------------
window.switchBannerSubTab = function(type) {
    // 탭 버튼 스타일 업데이트
    document.querySelectorAll('#tab-banners .sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    // 섹션 표시 업데이트
    document.querySelectorAll('.banner-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `banner-subtab-${type}`);
    });

    // 데이터 로드
    if (type === 'banner') fetchBanners();
    else if (type === 'best') initBestProductManage();
}

let currentBestSection = 'home_best_rfid';
let SITE_BEST_SECTIONS = [];
const DEFAULT_BEST_SECTIONS = [
    { id: 'home_best_rfid', label: 'RFID 시스템' },
    { id: 'home_best_supplies', label: '도서관 용품' },
    { id: 'home_best_furniture', label: '도서관 가구' },
    { id: 'home_best_sign', label: '사인물' }
];

async function fetchBestSections() {
    try {
        const { data, error } = await db.from('site_configs').select('value').eq('key', 'site_best_sections').single();
        if (error || !data) {
            SITE_BEST_SECTIONS = DEFAULT_BEST_SECTIONS;
            if (!data) await db.from('site_configs').upsert({ key: 'site_best_sections', value: DEFAULT_BEST_SECTIONS });
        } else {
            SITE_BEST_SECTIONS = data.value;
        }
    } catch (e) {
        SITE_BEST_SECTIONS = DEFAULT_BEST_SECTIONS;
    }
}

async function initBestProductManage() {
    // 섹션 정보 먼저 로드
    await fetchBestSections();
    renderBestSectionButtons();

    // 상품 목록 체크박스 렌더링
    if (globalProducts.length === 0) {
        fetchProducts().then(() => renderBestProductCheckboxes());
    } else {
        renderBestProductCheckboxes();
    }

    // 저장 버튼 이벤트
    const saveBtn = document.getElementById('saveBestDisplayBtn');
    if (saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = saveBestProductDisplay;
        saveBtn.dataset.init = "true";
    }

    // 초기 섹션 로드
    if (SITE_BEST_SECTIONS.length > 0) {
        if (!SITE_BEST_SECTIONS.find(s => s.id === currentBestSection)) {
            currentBestSection = SITE_BEST_SECTIONS[0].id;
        }
        selectBestSection(currentBestSection, SITE_BEST_SECTIONS.find(s => s.id === currentBestSection).label);
    }
}

function renderBestSectionButtons() {
    const grid = document.getElementById('bestSectionGrid');
    if (!grid) return;

    grid.innerHTML = SITE_BEST_SECTIONS.map(s => `
        <button class="minor-btn ${currentBestSection === s.id ? 'active' : ''}" 
                onclick="selectBestSection('${s.id}', '${s.label}')">
            ${s.label}
        </button>
    `).join('');
}

// 섹션 관리 모달 기능
window.openBestSectionModal = function() {
    renderBestSectionRows();
    document.getElementById('bestSectionModal').style.display = 'flex';
}

window.closeBestSectionModal = function() {
    document.getElementById('bestSectionModal').style.display = 'none';
}

function renderBestSectionRows() {
    const container = document.getElementById('bestSectionListContainer');
    if (!container) return;
    
    container.innerHTML = SITE_BEST_SECTIONS.map((s, index) => `
        <div class="best-section-row" style="display:flex; gap:10px; align-items:center;">
            <input type="text" class="form-control" placeholder="섹션 ID (영문)" value="${s.id}" style="flex:1;">
            <input type="text" class="form-control" placeholder="섹션명 (한글)" value="${s.label}" style="flex:2;">
            <button class="action-btn delete" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
}

window.addBestSectionRow = function() {
    const container = document.getElementById('bestSectionListContainer');
    const div = document.createElement('div');
    div.className = 'best-section-row';
    div.style.cssText = "display:flex; gap:10px; align-items:center;";
    div.innerHTML = `
        <input type="text" class="form-control" placeholder="섹션 ID (영문)" style="flex:1;">
        <input type="text" class="form-control" placeholder="섹션명 (한글)" style="flex:2;">
        <button class="action-btn delete" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(div);
}

window.saveBestSectionConfig = async function() {
    const rows = document.querySelectorAll('.best-section-row');
    const newSections = [];
    let hasEmpty = false;

    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const id = inputs[0].value.trim();
        const label = inputs[1].value.trim();
        if (!id || !label) hasEmpty = true;
        newSections.push({ id, label });
    });

    if (hasEmpty) {
        alert('모든 필드를 채워주세요.');
        return;
    }

    const saveBtn = document.getElementById('saveBestSectionBtn');
    saveBtn.disabled = true;
    saveBtn.innerText = '저장 중...';

    const { error } = await db.from('site_configs').upsert({
        key: 'site_best_sections',
        value: newSections
    });

    if (error) {
        alert('저장 실패: ' + error.message);
    } else {
        SITE_BEST_SECTIONS = newSections;
        renderBestSectionButtons();
        alert('섹션 구성이 저장되었습니다. 메인 페이지에도 반영됩니다.');
        closeBestSectionModal();
    }
    saveBtn.disabled = false;
    saveBtn.innerText = '설정 저장';
}

function renderBestProductCheckboxes() {
    const grid = document.getElementById('bestProductCheckboxGrid');
    if (!grid) return;

    if (globalProducts.length === 0) {
        grid.innerHTML = '<div style="color:#999; text-align:center; width:100%;">등록된 제품이 없습니다.</div>';
        return;
    }

    grid.innerHTML = globalProducts.map(p => {
        const displayCategory = getProductCategoryPath(p);
        return `
        <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; transition:background 0.2s;">
            <input type="checkbox" class="best-item-cb" value="${p.id}" style="transform:scale(1.3); margin-right:5px;">
            <div style="font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">
                <span style="color:#2980b9; font-size:0.75rem; font-weight:bold;">[${displayCategory}]</span><br>
                ${p.name}
            </div>
        </label>
        `;
    }).join('');

    // 체크박스 변경 시 정렬 리스트 갱신 연동
    grid.querySelectorAll('.best-item-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            updateBestProductSortListFromCheckbox(cb);
        });
    });
    
    // 현재 섹션의 데이터로 체크 상태 복구
    loadBestProductDisplay(currentBestSection);
}

// [신규] 체크박스 상태에 따라 베스트 상품 정렬 목록 업데이트
function updateBestProductSortListFromCheckbox(cb) {
    const sortList = document.getElementById('bestProductSortList');
    if (!sortList) return;

    const placeholder = sortList.querySelector('div[style*="color:#999"]');
    if (placeholder) {
        sortList.innerHTML = '';
    }

    const productId = cb.value;
    const labelWrapper = cb.closest('label');
    const productName = labelWrapper ? labelWrapper.querySelector('div').innerText.split('\n').pop().trim() : '알 수 없는 상품';

    if (cb.checked) {
        if (sortList.querySelector(`.best-sort-item[data-id="${productId}"]`)) return;

        const sortItem = document.createElement('div');
        sortItem.className = 'best-sort-item';
        sortItem.dataset.id = productId;
        sortItem.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:6px; cursor:grab; box-shadow:0 2px 5px rgba(0,0,0,0.02);";
        sortItem.innerHTML = `
            <i class="fa-solid fa-grip-vertical drag-handle" style="color:#aaa; cursor:grab;"></i>
            <span style="font-size:0.95rem; font-weight:600; color:#333; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${productName}</span>
            <button class="best-sort-remove-btn" type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removeBestProductFromSortList('${productId}')"><i class="fa-solid fa-xmark"></i></button>
        `;
        sortList.appendChild(sortItem);
    } else {
        const existingItem = sortList.querySelector(`.best-sort-item[data-id="${productId}"]`);
        if (existingItem) {
            existingItem.remove();
        }
    }

    if (sortList.children.length === 0) {
        sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">왼쪽에서 상품을 선택하면 여기에 표시됩니다.</div>';
    }

    if (typeof Sortable !== 'undefined') {
        Sortable.create(sortList, {
            handle: '.drag-handle',
            animation: 150
        });
    }
}

// [신규] 베스트 상품 정렬 목록에서 삭제 연동
window.removeBestProductFromSortList = (productId) => {
    const cb = document.querySelector(`.best-item-cb[value="${productId}"]`);
    if (cb) {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
    } else {
        const sortList = document.getElementById('bestProductSortList');
        const existingItem = sortList ? sortList.querySelector(`.best-sort-item[data-id="${productId}"]`) : null;
        if (existingItem) {
            existingItem.remove();
            if (sortList && sortList.children.length === 0) {
                sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">왼쪽에서 상품을 선택하면 여기에 표시됩니다.</div>';
            }
        }
    }
};

window.selectBestSection = function(sectionId, sectionName) {
    currentBestSection = sectionId;
    
    // 버튼 스타일 업데이트
    document.querySelectorAll('#bestSectionGrid .minor-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${sectionId}'` || sectionId));
    });

    // 상태창 업데이트
    document.getElementById('currentBestSelectionName').innerText = sectionName;

    // 데이터 로드
    loadBestProductDisplay(sectionId);
}

async function loadBestProductDisplay(sectionId) {
    const sortList = document.getElementById('bestProductSortList');
    if (!sortList) return;

    sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">로딩 중...</div>';

    const { data: configData } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionId).single();
    const selectedIds = configData ? configData.value : [];
    
    const checkboxes = document.querySelectorAll('.best-item-cb');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });

    sortList.innerHTML = '';
    selectedIds.forEach(id => {
        const p = globalProducts.find(prod => prod.id === id);
        if (!p) return;

        const sortItem = document.createElement('div');
        sortItem.className = 'best-sort-item';
        sortItem.dataset.id = p.id;
        sortItem.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:6px; cursor:grab; box-shadow:0 2px 5px rgba(0,0,0,0.02);";
        sortItem.innerHTML = `
            <i class="fa-solid fa-grip-vertical drag-handle" style="color:#aaa; cursor:grab;"></i>
            <span style="font-size:0.95rem; font-weight:600; color:#333; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</span>
            <button class="best-sort-remove-btn" type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removeBestProductFromSortList('${p.id}')"><i class="fa-solid fa-xmark"></i></button>
        `;
        sortList.appendChild(sortItem);
    });

    if (sortList.children.length === 0) {
        sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">왼쪽에서 상품을 선택하면 여기에 표시됩니다.</div>';
    }

    if (typeof Sortable !== 'undefined') {
        Sortable.create(sortList, {
            handle: '.drag-handle',
            animation: 150
        });
    }
}

async function saveBestProductDisplay() {
    if (!currentBestSection) return;
    
    const saveBtn = document.getElementById('saveBestDisplayBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

    // 정렬 목록에서 순서대로 ID 추출하여 저장
    const sortItems = document.querySelectorAll('#bestProductSortList .best-sort-item');
    const selectedIds = Array.from(sortItems).map(item => item.dataset.id);

    const { error } = await db.from('site_configs').upsert({
        key: 'display_' + currentBestSection,
        value: selectedIds
    });

    if (error) {
        alert('저장 실패: ' + error.message);
    } else {
        const sectionName = document.getElementById('currentBestSelectionName').innerText;
        alert(`[${sectionName}] 베스트 상품 전시 순서가 성공적으로 저장되었습니다.`);
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
}

// ------------------------------------------
// 8. [신규] 상세페이지 관리 로직 (멀티 제품 대응)
// ------------------------------------------
let currentPageDataKey = ''; // 기본값 비워둠 (targetPageId 값이 없을 수 있음)

function initPageManageTab() {
    const targetSelect = document.getElementById('targetPageId');
    const majorFilter = document.getElementById('pageMajorFilter');
    const middleFilter = document.getElementById('pageMiddleFilter');
    const subFilter = document.getElementById('pageSubFilter');
    
    // 카테고리 필터 초기화
    if (majorFilter && !majorFilter.dataset.init) {
        // 대분류 채우기
        const sortedMajors = Object.keys(SITE_CATEGORIES).sort((a, b) => (SITE_CATEGORIES[a].order || 0) - (SITE_CATEGORIES[b].order || 0));
        majorFilter.innerHTML = '<option value="all">전체 대분류</option>' + 
            sortedMajors.map(key => `<option value="${key}">${SITE_CATEGORIES[key].label}</option>`).join('');

        majorFilter.addEventListener('change', () => {
            const mKey = majorFilter.value;
            // 중분류 업데이트
            if (mKey === 'all') {
                middleFilter.innerHTML = '<option value="all">전체 중분류</option>';
            } else {
                const major = SITE_CATEGORIES[mKey];
                const sortedMiddles = Object.keys(major.middles).sort((a, b) => (major.middles[a].order || 0) - (major.middles[b].order || 0));
                middleFilter.innerHTML = '<option value="all">전체 중분류</option>' + 
                    sortedMiddles.map(key => `<option value="${key}">${major.middles[key].label}</option>`).join('');
            }
            subFilter.innerHTML = '<option value="all">전체 소분류</option>';
            renderPageManageProducts();
        });

        middleFilter.addEventListener('change', () => {
            const mKey = majorFilter.value;
            const midKey = middleFilter.value;
            // 소분류 업데이트
            if (midKey === 'all') {
                subFilter.innerHTML = '<option value="all">전체 소분류</option>';
            } else {
                const middle = SITE_CATEGORIES[mKey].middles[midKey];
                const sortedSubs = [...middle.subs].sort((a, b) => (a.order || 0) - (b.order || 0));
                subFilter.innerHTML = '<option value="all">전체 소분류</option>' + 
                    sortedSubs.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
            }
            renderPageManageProducts();
        });

        subFilter.addEventListener('change', () => {
            renderPageManageProducts();
        });

        majorFilter.dataset.init = "true";
    }

    const savePageBtn = document.getElementById('savePageBtn');
    const addSpecBtn = document.getElementById('addSpecBtn');
    const specContainer = document.getElementById('specContainer');
    const addFeatureBtn = document.getElementById('addFeatureBtn');
    const featureContainer = document.getElementById('featureContainer');
    
    const pageMainImage = document.getElementById('pageMainImage');
    const pageMainImagePreview = document.getElementById('pageMainImagePreview');
    const pageDetailImage = document.getElementById('pageDetailImage');
    const pageDetailImagePreview = document.getElementById('pageDetailImagePreview');
    const pageDescription = document.getElementById('pageDescription');

    // 1. 제품 선택 변경 시 로드
    targetSelect.addEventListener('change', (e) => {
        if (!e.target.value) {
            currentPageDataKey = '';
            clearPageManageUI();
            return;
        }
        currentPageDataKey = 'pageData_' + e.target.value;
        loadPageData();
    });

    // 2. 항목 추가 버튼들
    if(addSpecBtn && !addSpecBtn.dataset.init) {
        addSpecBtn.addEventListener('click', () => createSpecRow('', ''));
        addSpecBtn.dataset.init = "true";
    }
    if(addFeatureBtn && !addFeatureBtn.dataset.init) {
        addFeatureBtn.addEventListener('click', () => createFeatureBlock('', ''));
        addFeatureBtn.dataset.init = "true";
    }

    // 3. 이미지 미리보기 처리
    if (pageMainImagePreview && typeof Sortable !== 'undefined') {
        new Sortable(pageMainImagePreview, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: 'button, i.fa-image',
            preventOnFilter: false
        });
    }
    if (pageDetailImagePreview && typeof Sortable !== 'undefined') {
        new Sortable(pageDetailImagePreview, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: 'button, i.fa-image',
            preventOnFilter: false
        });
    }

    if(pageMainImage && !pageMainImage.dataset.init) {
        pageMainImage.addEventListener('change', (e) => {
            const placeholder = pageMainImagePreview.querySelector('i.fa-image');
            if (placeholder) {
                placeholder.remove();
            }
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = "position: relative; display: inline-block; cursor: grab;";
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.cssText = "width:80px; height:80px; object-fit:cover; border-radius:4px; border:1px solid #ddd;";
                    const delBtn = document.createElement('button');
                    delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    delBtn.style.cssText = "position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; z-index:1;";
                    delBtn.onclick = () => {
                        wrapper.remove();
                        if (pageMainImagePreview.children.length === 0) {
                            pageMainImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc; margin:auto;"></i>';
                        }
                    };
                    wrapper.appendChild(img);
                    wrapper.appendChild(delBtn);
                    pageMainImagePreview.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            });
        });
        pageMainImage.dataset.init = "true";
    }

    if(pageDetailImage && !pageDetailImage.dataset.init) {
        pageDetailImage.addEventListener('change', (e) => {
            const placeholder = pageDetailImagePreview.querySelector('i.fa-image');
            if (placeholder) {
                placeholder.remove();
            }
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = "position: relative; display: inline-block; max-width: 100%; cursor: grab;";
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.cssText = "max-width:100%; border-radius:4px; border:1px solid #eee; display:block;";
                    const delBtn = document.createElement('button');
                    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> 삭제';
                    delBtn.style.cssText = "position:absolute; top:10px; right:10px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:4px; padding:5px 10px; cursor:pointer; font-size:14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index:1;";
                    delBtn.onclick = () => {
                        wrapper.remove();
                        if (pageDetailImagePreview.children.length === 0) {
                            pageDetailImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
                        }
                    };
                    wrapper.appendChild(img);
                    wrapper.appendChild(delBtn);
                    pageDetailImagePreview.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            });
        });
        pageDetailImage.dataset.init = "true";
    }

    // [개선] 데이터 URL을 Supabase Storage에 업로드하는 헬퍼 함수
    async function uploadDataUrl(dataUrl, bucket, folder = 'details') {
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const fileExt = blob.type.split('/')[1] || 'png';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;
            
            const { error: uploadError } = await db.storage.from(bucket).upload(filePath, blob);
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = db.storage.from(bucket).getPublicUrl(filePath);
            return publicUrl;
        } catch (err) {
            console.error('Upload Error:', err);
            throw new Error('이미지 업로드 중 오류가 발생했습니다: ' + err.message);
        }
    }

    // 4. 저장 버튼
    if(savePageBtn && !savePageBtn.dataset.init) {
        savePageBtn.addEventListener('click', async () => {
            if (!targetSelect.value) {
                alert('수정할 대상 제품을 먼저 선택하세요.');
                return;
            }

            const originalBtnText = savePageBtn.innerHTML;
            savePageBtn.disabled = true;
            savePageBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

            try {
                // 1. 대표 사진들 처리 (신규인 경우 업로드)
                const mainImageElements = Array.from(pageMainImagePreview.querySelectorAll('img'));
                const mainImages = [];
                for (const img of mainImageElements) {
                    if (img.src.startsWith('data:')) {
                        const url = await uploadDataUrl(img.src, 'product-images');
                        mainImages.push(url);
                    } else if (img.src.startsWith('http')) {
                        mainImages.push(img.src);
                    }
                }

                // 2. 상세 이미지들 처리
                const detailImageElements = Array.from(pageDetailImagePreview.querySelectorAll('img'));
                const detailImages = [];
                for (const img of detailImageElements) {
                    if (img.src.startsWith('data:')) {
                        const url = await uploadDataUrl(img.src, 'product-images');
                        detailImages.push(url);
                    } else if (img.src.startsWith('http')) {
                        detailImages.push(img.src);
                    }
                }

                const data = {
                    mainImages: mainImages,
                    detailImages: detailImages, // [변경] 다중 이미지 대응
                    description: pageDescription.value,
                    specStyle: document.getElementById('specStyle').value,
                    featureStyle: document.getElementById('featureStyle').value,
                    specs: [],
                    features: []
                };
                
                specContainer.querySelectorAll('.spec-row').forEach(row => {
                    const keyInput = row.querySelector('.spec-key');
                    const editorContainer = row.querySelector('.spec-val-editor');
                    if(keyInput && keyInput.value) {
                        const valHTML = editorContainer && editorContainer.__quill ? editorContainer.__quill.root.innerHTML : (row.querySelectorAll('input')[1] ? row.querySelectorAll('input')[1].value : '');
                        data.specs.push({ key: keyInput.value, val: valHTML });
                    }
                });
                
                featureContainer.querySelectorAll('.feature-block').forEach(block => {
                    const titleInput = block.querySelector('.feature-title');
                    const editorContainer = block.querySelector('.feature-desc-editor');
                    if(titleInput && titleInput.value) {
                        const descHTML = editorContainer && editorContainer.__quill ? editorContainer.__quill.root.innerHTML : (block.querySelector('textarea') ? block.querySelector('textarea').value : '');
                        data.features.push({ title: titleInput.value, desc: descHTML });
                    }
                });
                
                // [변경] localStorage 대신 Supabase site_configs 테이블에 저장
                const { error: configError } = await db.from('site_configs').upsert({
                    key: currentPageDataKey,
                    value: data
                });
                
                if (configError) throw configError;
                
                const productName = targetSelect.options[targetSelect.selectedIndex].text;
                alert(`[${productName}] 상세페이지 설정이 성공적으로 저장되었습니다.`);
                
                // 업로드 후 미리보기의 src를 새 URL로 교체 (다시 저장할 때 재업로드 방지)
                loadPageData(); 

            } catch (error) {
                console.error('Save Error:', error);
                alert('저장 중 오류가 발생했습니다: ' + error.message);
            } finally {
                savePageBtn.disabled = false;
                savePageBtn.innerHTML = originalBtnText;
            }
        });
        savePageBtn.dataset.init = "true";
    }

    // 초기 데이터 로드
    if (targetSelect.value) {
        currentPageDataKey = 'pageData_' + targetSelect.value;
        loadPageData();
    } else {
        // 제품 목록이 아직 없는 경우
        currentPageDataKey = '';
    }
}

function createSpecRow(key, val) {
    const specContainer = document.getElementById('specContainer');
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.style.cssText = "display:flex; gap:10px; align-items:flex-start; margin-bottom:10px;";
    
    const qId = 'spec_val_' + Date.now() + Math.floor(Math.random()*1000);
    const tId = 'toolbar_' + qId;
    
    row.innerHTML = `
        <input type="text" class="form-control spec-key" placeholder="항목명" value="${key}" style="flex:1; margin-top:5px;">
        <div style="flex:2; background:#fff; min-width:0; display:flex; flex-direction:column; border:1px solid #d4d4d4; border-radius:4px; overflow:hidden;">
            <div id="${tId}" class="excel-toolbar">
                <div class="excel-toolbar-group font-group">
                    <select class="ql-font excel-select font-select">
                        <option value="Malgun Gothic" selected>맑은 고딕</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Pretendard">Pretendard</option>
                        <option value="Gulim">굴림</option>
                        <option value="Dotum">돋움</option>
                        <option value="Gungsuh">궁서</option>
                    </select>
                    <select class="ql-size excel-select size-select">
                        <option value="9px">9</option>
                        <option value="10px">10</option>
                        <option value="11px" selected>11</option>
                        <option value="12px">12</option>
                        <option value="14px">14</option>
                        <option value="16px">16</option>
                        <option value="18px">18</option>
                        <option value="20px">20</option>
                        <option value="24px">24</option>
                        <option value="30px">30</option>
                        <option value="36px">36</option>
                    </select>
                    <button class="excel-btn ql-excel-size-up" type="button" title="글꼴 크기 크게">가<sup>▲</sup></button>
                    <button class="excel-btn ql-excel-size-down" type="button" title="글꼴 크기 작게">가<sub>▼</sub></button>
                </div>
                <div class="excel-toolbar-divider"></div>
                <div class="excel-toolbar-group style-group">
                    <button class="ql-bold excel-btn bold-btn" type="button" title="굵게">가</button>
                    <button class="ql-italic excel-btn italic-btn" type="button" title="기울임꼴">가</button>
                    <button class="ql-underline excel-btn underline-btn" type="button" title="밑줄">가</button>
                </div>
                <div class="excel-toolbar-divider"></div>
                <div class="excel-toolbar-group color-group">
                    <button class="ql-table excel-btn" type="button" title="표 삽입"><i class="fa-solid fa-table-cells" style="font-size: 11px;"></i></button>
                    <select class="ql-background excel-color-picker" title="채우기 색"></select>
                    <select class="ql-color excel-color-picker" title="글꼴 색"></select>
                </div>
                <div class="excel-toolbar-label">글꼴</div>
            </div>
            <div id="${qId}" class="spec-val-editor" style="min-height: 80px; border:none !important; padding: 10px;">${val}</div>
        </div>
        <button class="action-btn delete" onclick="this.parentElement.remove()" style="margin-top:5px;"><i class="fa-solid fa-circle-minus"></i></button>
    `;
    specContainer.appendChild(row);
    
    if (typeof Quill !== 'undefined') {
        const quill = new Quill('#' + qId, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: '#' + tId,
                    handlers: {
                        table: function() {
                            const tableModule = this.quill.getModule('table');
                            if (tableModule) {
                                tableModule.insertTable(3, 3);
                            }
                        }
                    }
                },
                table: true
            }
        });
        row.querySelector('.spec-val-editor').__quill = quill;
        
        // 폰트 크기 증감 기능 바인딩
        const EXCEL_SIZES = ['9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];
        row.querySelector('.ql-excel-size-up').addEventListener('click', () => {
            const range = quill.getSelection();
            if (!range) return;
            const formats = quill.getFormat(range);
            let currentSize = formats.size || '11px';
            let index = EXCEL_SIZES.indexOf(currentSize);
            if (index === -1) index = EXCEL_SIZES.indexOf('11px');
            if (index < EXCEL_SIZES.length - 1) {
                quill.format('size', EXCEL_SIZES[index + 1]);
            }
        });
        
        row.querySelector('.ql-excel-size-down').addEventListener('click', () => {
            const range = quill.getSelection();
            if (!range) return;
            const formats = quill.getFormat(range);
            let currentSize = formats.size || '11px';
            let index = EXCEL_SIZES.indexOf(currentSize);
            if (index === -1) index = EXCEL_SIZES.indexOf('11px');
            if (index > 0) {
                quill.format('size', EXCEL_SIZES[index - 1]);
            }
        });
    }
}

function createFeatureBlock(title, desc) {
    const featureContainer = document.getElementById('featureContainer');
    const block = document.createElement('div');
    block.className = 'feature-block';
    block.style.cssText = "background:#f9f9f9; padding:15px; border-radius:6px; border:1px solid #eee; display:flex; flex-direction:column; gap:8px;";
    
    const qId = 'feat_desc_' + Date.now() + Math.floor(Math.random()*1000);
    const tId = 'toolbar_' + qId;
    
    block.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <input type="text" class="form-control feature-title" placeholder="특징 제목" value="${title}" style="font-weight:bold; width:85%;">
            <button class="action-btn delete" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div style="background:#fff; min-width:0; display:flex; flex-direction:column; border:1px solid #d4d4d4; border-radius:4px; overflow:hidden;">
            <div id="${tId}" class="excel-toolbar">
                <div class="excel-toolbar-group font-group">
                    <select class="ql-font excel-select font-select">
                        <option value="Malgun Gothic" selected>맑은 고딕</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Pretendard">Pretendard</option>
                        <option value="Gulim">굴림</option>
                        <option value="Dotum">돋움</option>
                        <option value="Gungsuh">궁서</option>
                    </select>
                    <select class="ql-size excel-select size-select">
                        <option value="9px">9</option>
                        <option value="10px">10</option>
                        <option value="11px" selected>11</option>
                        <option value="12px">12</option>
                        <option value="14px">14</option>
                        <option value="16px">16</option>
                        <option value="18px">18</option>
                        <option value="20px">20</option>
                        <option value="24px">24</option>
                        <option value="30px">30</option>
                        <option value="36px">36</option>
                    </select>
                    <button class="excel-btn ql-excel-size-up" type="button" title="글꼴 크기 크게">가<sup>▲</sup></button>
                    <button class="excel-btn ql-excel-size-down" type="button" title="글꼴 크기 작게">가<sub>▼</sub></button>
                </div>
                <div class="excel-toolbar-divider"></div>
                <div class="excel-toolbar-group style-group">
                    <button class="ql-bold excel-btn bold-btn" type="button" title="굵게">가</button>
                    <button class="ql-italic excel-btn italic-btn" type="button" title="기울임꼴">가</button>
                    <button class="ql-underline excel-btn underline-btn" type="button" title="밑줄">가</button>
                </div>
                <div class="excel-toolbar-divider"></div>
                <div class="excel-toolbar-group color-group">
                    <button class="ql-table excel-btn" type="button" title="표 삽입"><i class="fa-solid fa-table-cells" style="font-size: 11px;"></i></button>
                    <select class="ql-background excel-color-picker" title="채우기 색"></select>
                    <select class="ql-color excel-color-picker" title="글꼴 색"></select>
                </div>
                <div class="excel-toolbar-label">글꼴</div>
            </div>
            <div id="${qId}" class="feature-desc-editor" style="min-height: 120px; border:none !important; padding: 10px;">${desc}</div>
        </div>
    `;
    featureContainer.appendChild(block);
    
    if (typeof Quill !== 'undefined') {
        const quill = new Quill('#' + qId, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: '#' + tId,
                    handlers: {
                        table: function() {
                            const tableModule = this.quill.getModule('table');
                            if (tableModule) {
                                tableModule.insertTable(3, 3);
                            }
                        }
                    }
                },
                table: true
            }
        });
        block.querySelector('.feature-desc-editor').__quill = quill;
        
        // 폰트 크기 증감 기능 바인딩
        const EXCEL_SIZES = ['9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];
        block.querySelector('.ql-excel-size-up').addEventListener('click', () => {
            const range = quill.getSelection();
            if (!range) return;
            const formats = quill.getFormat(range);
            let currentSize = formats.size || '11px';
            let index = EXCEL_SIZES.indexOf(currentSize);
            if (index === -1) index = EXCEL_SIZES.indexOf('11px');
            if (index < EXCEL_SIZES.length - 1) {
                quill.format('size', EXCEL_SIZES[index + 1]);
            }
        });
        
        block.querySelector('.ql-excel-size-down').addEventListener('click', () => {
            const range = quill.getSelection();
            if (!range) return;
            const formats = quill.getFormat(range);
            let currentSize = formats.size || '11px';
            let index = EXCEL_SIZES.indexOf(currentSize);
            if (index === -1) index = EXCEL_SIZES.indexOf('11px');
            if (index > 0) {
                quill.format('size', EXCEL_SIZES[index - 1]);
            }
        });
    }
}

async function loadPageData() {
    if(!currentPageDataKey) {
        clearPageManageUI();
        return;
    }

    // [변경] localStorage 대신 Supabase site_configs 테이블에서 로드
    const { data: configData, error } = await db.from('site_configs').select('value').eq('key', currentPageDataKey).single();
    const rawData = configData ? configData.value : null;
    
    clearPageManageUI();

    if(!rawData) return;
    const data = rawData;
    
    const specContainer = document.getElementById('specContainer');
    const featureContainer = document.getElementById('featureContainer');
    const pageMainImagePreview = document.getElementById('pageMainImagePreview');
    const pageDetailImagePreview = document.getElementById('pageDetailImagePreview');
    const pageDescription = document.getElementById('pageDescription');

    if(data.mainImages && data.mainImages.length > 0) {
        pageMainImagePreview.innerHTML = '';
        data.mainImages.forEach(src => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "position: relative; display: inline-block; cursor: grab;";
            const img = document.createElement('img');
            img.src = src; img.style.cssText = "width:80px; height:80px; object-fit:cover; border-radius:4px; border:1px solid #ddd;";
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            delBtn.style.cssText = "position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; z-index:1;";
            delBtn.onclick = () => {
                wrapper.remove();
                if (pageMainImagePreview.children.length === 0) {
                    pageMainImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc; margin:auto;"></i>';
                }
            };
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            pageMainImagePreview.appendChild(wrapper);
        });
    }
    if(data.detailImages || data.detailImage) {
        pageDetailImagePreview.innerHTML = '';
        const imgs = data.detailImages || [data.detailImage];
        imgs.forEach(src => {
            if(!src) return;
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "position: relative; display: inline-block; max-width: 100%; cursor: grab;";
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = "max-width:100%; border-radius:4px; border:1px solid #eee; display:block;";
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> 삭제';
            delBtn.style.cssText = "position:absolute; top:10px; right:10px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:4px; padding:5px 10px; cursor:pointer; font-size:14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index:1;";
            delBtn.onclick = () => {
                wrapper.remove();
                if (pageDetailImagePreview.children.length === 0) {
                    pageDetailImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
                }
            };
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            pageDetailImagePreview.appendChild(wrapper);
        });
    }

    // [신규] 특징 및 규격 레이아웃 미리보기 이미지 갱신 함수
    function updateFeatureStylePreview() {
        const select = document.getElementById('featureStyle');
        const previewBox = document.getElementById('featureStylePreview');
        if (!select || !previewBox) return;
        
        const val = select.value || 'type-a';
        const img = previewBox.querySelector('img');
        if (img) {
            img.src = `assets/feature_preview_${val.replace('type-', '')}.png`;
            previewBox.style.display = 'block';
        }
    }

    function updateSpecStylePreview() {
        const select = document.getElementById('specStyle');
        const previewBox = document.getElementById('specStylePreview');
        if (!select || !previewBox) return;
        
        const val = select.value || 'type-a';
        const img = previewBox.querySelector('img');
        if (img) {
            img.src = `assets/spec_preview_${val.replace('type-', '')}.png`;
            previewBox.style.display = 'block';
        }
    }

    // 이벤트 바인딩 자동 수행 (일회성)
    document.addEventListener('DOMContentLoaded', () => {
        const fSelect = document.getElementById('featureStyle');
        const sSelect = document.getElementById('specStyle');
        if (fSelect) fSelect.addEventListener('change', updateFeatureStylePreview);
        if (sSelect) sSelect.addEventListener('change', updateSpecStylePreview);
    });

    pageDescription.value = data.description || '';
    if(data.specStyle) document.getElementById('specStyle').value = data.specStyle;
    if(data.featureStyle) document.getElementById('featureStyle').value = data.featureStyle;
    updateFeatureStylePreview();
    updateSpecStylePreview();
    if(data.specs) data.specs.forEach(s => createSpecRow(s.key, s.val));
    if(data.features) data.features.forEach(f => createFeatureBlock(f.title, f.desc));
}

function clearPageManageUI() {
    const specContainer = document.getElementById('specContainer');
    const featureContainer = document.getElementById('featureContainer');
    const pageMainImagePreview = document.getElementById('pageMainImagePreview');
    const pageDetailImagePreview = document.getElementById('pageDetailImagePreview');
    const pageDescription = document.getElementById('pageDescription');

    if (specContainer) specContainer.innerHTML = '';
    if (featureContainer) featureContainer.innerHTML = '';
    if (pageMainImagePreview) pageMainImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc; margin:auto;"></i>';
    if (pageDetailImagePreview) pageDetailImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
    if (pageDescription) pageDescription.value = '';
    if (document.getElementById('specStyle')) document.getElementById('specStyle').value = 'type-a';
    if (document.getElementById('featureStyle')) document.getElementById('featureStyle').value = 'type-a';
    updateFeatureStylePreview();
    updateSpecStylePreview();
    
    // 파일 인풋도 초기화
    if (document.getElementById('pageMainImage')) document.getElementById('pageMainImage').value = '';
    if (document.getElementById('pageDetailImage')) document.getElementById('pageDetailImage').value = '';
}

async function fetchUsers() {
    const tBody = document.getElementById('userTableBody');
    if (!tBody) return;

    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">회원 정보를 불러오는 중입니다...</td></tr>';

    const { data: users, error } = await db.from('users').select('*').order('created_at', { ascending: false });

    if (error) {
        console.warn('Users Table 에러:', error.message);
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger)">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:10px;"></i><br>
            <b>'users'</b> 테이블을 불러올 수 없습니다. (${error.message})<br>
            <div style="font-size:0.8rem; background:#f9f9f9; padding:10px; margin-top:10px; text-align:left; border-radius:4px;">
                SQL Editor에서 다음을 실행하세요:<br>
                <code>CREATE TABLE users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), institution_name text, manager_name text, phone text, email text, discount_rate int DEFAULT 0, memo text, created_at timestamp with time zone DEFAULT now());</code>
            </div>
        </td></tr>`;
        return;
    }

    if (!users || users.length === 0) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">등록된 관리 회원이 없습니다.</td></tr>';
        return;
    }

    tBody.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : 'N/A';
        
        tr.innerHTML = `
            <td>${u.id.substring(0, 8)}</td>
            <td style="font-weight:600;">${u.institution_name || '미입력'}</td>
            <td>${u.manager_name || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td style="color:var(--primary); font-weight:bold;">${u.discount_rate || 0}%</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td>
                <button class="action-btn" onclick="editUser('${u.id}')" title="수정"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteUser('${u.id}', '${u.institution_name}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

// User Modal Logic
function openUserModal(isEdit = false) {
    if (!isEdit) {
        userModalTitle.textContent = '새 회원 등록';
        editUserIdInput.value = '';
        userInstitutionInput.value = '';
        userManagerInput.value = '';
        userPhoneInput.value = '';
        userEmailInput.value = '';
        userDiscountInput.value = '0';
        userMemoInput.value = '';
    } else {
        userModalTitle.textContent = '회원 정보 수정';
    }
    saveUserMsg.textContent = '';
    saveUserBtn.disabled = false;
    saveUserBtn.textContent = '저장하기';
    userModal.style.display = 'flex';
}

function closeUserModal() { userModal.style.display = 'none'; }

if (addUserBtn) addUserBtn.addEventListener('click', () => openUserModal(false));
if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
if (cancelUserModalBtn) cancelUserModalBtn.addEventListener('click', closeUserModal);

saveUserBtn.addEventListener('click', async () => {
    const payload = {
        institution_name: userInstitutionInput.value.trim(),
        manager_name: userManagerInput.value.trim(),
        phone: userPhoneInput.value.trim(),
        email: userEmailInput.value.trim(),
        discount_rate: parseInt(userDiscountInput.value) || 0,
        memo: userMemoInput.value.trim()
    };

    if (!payload.institution_name) {
        saveUserMsg.textContent = '기관명은 필수입니다.';
        return;
    }

    saveUserBtn.disabled = true;
    saveUserBtn.textContent = '저장 중...';

    const id = editUserIdInput.value;
    let error;

    if (id) {
        const { error: updateError } = await db.from('users').update(payload).eq('id', id);
        error = updateError;
    } else {
        const { error: insertError } = await db.from('users').insert([payload]);
        error = insertError;
    }

    if (error) {
        saveUserMsg.textContent = '저장 실패: ' + error.message;
        saveUserBtn.disabled = false;
        saveUserBtn.textContent = '저장하기';
    } else {
        closeUserModal();
        fetchUsers();
    }
});

window.editUser = async (id) => {
    const { data: u, error } = await db.from('users').select('*').eq('id', id).single();
    if (error) { alert("데이터 불러오기 실패"); return; }
    
    openUserModal(true);
    editUserIdInput.value = u.id;
    userInstitutionInput.value = u.institution_name || '';
    userManagerInput.value = u.manager_name || '';
    userPhoneInput.value = u.phone || '';
    userEmailInput.value = u.email || '';
    userDiscountInput.value = u.discount_rate || 0;
    userMemoInput.value = u.memo || '';
};

window.deleteUser = async (id, name) => {
    if (confirm(`"${name}" 회원을 삭제하시겠습니까?`)) {
        const { error } = await db.from('users').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchUsers();
    }
};

// 8. [개선] 카테고리 전시 관리 (전체 카테고리 대응 및 UI 고도화)
// ------------------------------------------
// (SITE_CATEGORIES는 상단 전역으로 이동됨)

let currentSelectedSection = ''; // 현재 선택된 소분류 ID

function initCategoryDisplayTab() {
    const minorGrid = document.getElementById('minorCategoryGrid');
    const saveBtn = document.getElementById('saveDisplayBtn');
    const statusBox = document.getElementById('displaySectionStatus');
    const selectionName = document.getElementById('currentSelectionName');

    // (Static majorBtns event binding removed, now handled by renderMajorButtons)

    // 1. 대분류 렌더링 및 이벤트 바인딩
    function renderMajorButtons() {
        const majorGrid = document.getElementById('majorCategoryGrid');
        if (!majorGrid) return;

        majorGrid.innerHTML = '';
        let firstKey = '';
        for (const key in SITE_CATEGORIES) {
            if (!firstKey) firstKey = key;
            const major = SITE_CATEGORIES[key];
            const btn = document.createElement('button');
            btn.className = 'major-btn';
            btn.innerHTML = `<i class="fa-solid ${major.icon || 'fa-folder'}"></i> ${major.label}`;
            btn.onclick = () => {
                document.querySelectorAll('.major-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderMinorCategories(key);
            };
            majorGrid.appendChild(btn);
        }

        // 초기 선택 (첫 번째 대분류)
        const firstBtn = majorGrid.querySelector('.major-btn');
        if (firstBtn) firstBtn.click();
    }

    // 2. 소분류 렌더링 함수 (3단계 대응)
    function renderMinorCategories(majorKey) {
        const major = SITE_CATEGORIES[majorKey];
        if (!major || !major.middles) return;

        let html = '';
        for (const midKey in major.middles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            middle.subs.forEach(sub => {
                const displayName = `${middle.label} > ${sub.label}`;
                const combinedId = `${midKey}-${sub.id}`;
                html += `
                    <button class="minor-btn ${currentSelectedSection === combinedId ? 'active' : ''}" 
                            onclick="selectMinorCategory('${combinedId}', '${displayName}')">
                        ${displayName}
                    </button>
                `;
            });
        }
        
        minorGrid.innerHTML = html || '<div style="color:#999; text-align:center; width:100%;">이 분류 아래에 등록된 소분류가 없습니다.</div>';
    }

    // 3. 소분류 선택 함수 (전역 window 객체에 연결하여 onclick 대응)
    window.selectMinorCategory = (combinedId, name) => {
        currentSelectedSection = combinedId;
        
        // 버튼 스타일 업데이트
        document.querySelectorAll('.minor-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${combinedId}'`));
        });

        // 상태창 업데이트
        statusBox.style.display = 'block';
        selectionName.innerText = name;

        // 체크박스 데이터 로드
        loadCategoryDisplay(combinedId);
    };

    // 4. 저장 버튼
    if(saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = async () => {
            if(!currentSelectedSection) {
                alert('먼저 관리할 소분류(전시화면)를 선택해주세요.');
                return;
            }
            
            // 정렬 목록에서 순서대로 ID 추출
            const sortItems = document.querySelectorAll('#productSortList .sort-item');
            const selectedProducts = Array.from(sortItems).map(item => item.dataset.id);

            // [변경] localStorage 대신 Supabase site_configs 테이블에 저장
            const { error: displayError } = await db.from('site_configs').upsert({
                key: 'display_' + currentSelectedSection,
                value: selectedProducts
            });

            if (displayError) {
                alert('저장 실패: ' + displayError.message);
                return;
            }
            alert(`[${selectionName.innerText}] 화면 배치가 성공적으로 저장되었습니다.`);
        };
        saveBtn.dataset.init = "true";
    }

    // 초기 실행
    renderMajorButtons();
}

async function loadCategoryDisplay(sectionKey) {
    const sortList = document.getElementById('productSortList');
    if (!sortList) return;
    
    sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">로딩 중...</div>';

    // [변경] localStorage 대신 Supabase site_configs 테이블에서 로드
    const { data: configData, error } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionKey).single();
    const selectedIds = configData ? configData.value : [];
    
    const checkboxes = document.querySelectorAll('.display-item-cb');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
    
    // 정렬 리스트 렌더링
    sortList.innerHTML = '';
    
    // selectedIds에 저장된 순서대로 정렬 리스트 아이템 노출
    selectedIds.forEach(id => {
        const p = globalProducts.find(prod => prod.id === id);
        if (!p) return;
        
        const sortItem = document.createElement('div');
        sortItem.className = 'sort-item';
        sortItem.dataset.id = p.id;
        sortItem.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:6px; cursor:grab; box-shadow:0 2px 5px rgba(0,0,0,0.02);";
        sortItem.innerHTML = `
            <i class="fa-solid fa-grip-vertical drag-handle" style="color:#aaa; cursor:grab;"></i>
            <span style="font-size:0.95rem; font-weight:600; color:#333; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</span>
            <button class="sort-remove-btn" type="button" style="color:#e74c3c; background:none; border:none; cursor:pointer;" onclick="removeProductFromSortList('${p.id}')"><i class="fa-solid fa-xmark"></i></button>
        `;
        sortList.appendChild(sortItem);
    });

    if (sortList.children.length === 0) {
        sortList.innerHTML = '<div style="color:#999; text-align:center; padding: 40px 0; width:100%;">왼쪽에서 상품을 선택하면 여기에 표시됩니다.</div>';
    }

    // SortableJS 인스턴스화
    if (typeof Sortable !== 'undefined') {
        Sortable.create(sortList, {
            handle: '.drag-handle',
            animation: 150
        });
    }
}

// ------------------------------------------
// 9. [신규] 카테고리 구성 관리 (3단계 계층 관리)
// ------------------------------------------

// 9-1. 데이터 로드 및 초기화
async function fetchCategories() {
    try {
        const { data, error } = await db.from('site_configs').select('value').eq('key', 'site_categories').single();
        if (error || !data) {
            console.log("No site_categories found or error fetching. Initializing with default.");
            SITE_CATEGORIES = DEFAULT_CATEGORIES;
            // 404 에러 등이 아닐 경우(데이터가 없을 경우)만 업서트 시도
            if (!data) {
                await db.from('site_configs').upsert({ key: 'site_categories', value: DEFAULT_CATEGORIES });
            }
        } else {
            SITE_CATEGORIES = data.value;
        }
    } catch (err) {
        console.error("fetchCategories Error:", err);
        SITE_CATEGORIES = DEFAULT_CATEGORIES;
    }
    // 데이터 유효성 최소 보장
    if (!SITE_CATEGORIES || typeof SITE_CATEGORIES !== 'object') {
        SITE_CATEGORIES = DEFAULT_CATEGORIES;
    }
    
    // [신규] 카테고리 필터 드롭다운 채우기
    populateCategoryFilter();
}

// 제품 관리 탭의 카테고리 필터 드롭다운 동적 생성
function populateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    if (!filter) return;

    let html = '<option value="all">전체 카테고리</option>';
    html += '<option value="best_product">★ 베스트 상품</option>';

    for (const mKey in SITE_CATEGORIES) {
        const major = SITE_CATEGORIES[mKey];
        if (!major || !major.middles) continue;

        for (const midKey in major.middles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            middle.subs.forEach(sub => {
                html += `<option value="${sub.id}">${major.label} > ${middle.label} > ${sub.label}</option>`;
            });
        }
    }
    filter.innerHTML = html;
}

// 9-2. 제품 등록 모달의 카테고리 드롭다운 갱신
function updateProductModalDropdown() {
    const select = document.getElementById('productCategory');
    if (!select) return;

    let html = '<option value="" disabled selected>기본 소속 카테고리 선택</option>';
    html += '<option value="best_product">★ 메인화면 베스트 상품</option>';
    
    for (const mKey in SITE_CATEGORIES) {
        const major = SITE_CATEGORIES[mKey];
        if (!major || !major.middles) continue;

        html += `<optgroup label="${major.label}">`;
        for (const midKey in major.middles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            middle.subs.forEach(sub => {
                html += `<option value="${sub.id}">${middle.label} > ${sub.label}</option>`;
            });
        }
        html += `</optgroup>`;
    }
    select.innerHTML = html;
}

// 9-3. 카테고리 관리 탭 초기화
function initCategoryManageTab() {
    const saveBtn = document.getElementById('saveCategoryConfigBtn');
    const addMajorBtn = document.getElementById('addMajorBtn');

    if (saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
            const { error } = await db.from('site_configs').upsert({ key: 'site_categories', value: SITE_CATEGORIES });
            if (error) alert("저장 실패: " + error.message);
            else alert("카테고리 구성이 성공적으로 저장되었습니다.");
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> 설정 영구 저장';
        };
        saveBtn.dataset.init = "true";
    }

    if (addMajorBtn && !addMajorBtn.dataset.init) {
        addMajorBtn.onclick = () => {
            openCategoryModal('major', null, null, null, '새 대분류', 0, 'fa-folder');
        };
        addMajorBtn.dataset.init = "true";
    }

    // 모달 닫기 이벤트
    if (closeCategoryModalBtn) closeCategoryModalBtn.onclick = () => categoryModal.style.display = 'none';
    if (cancelCategoryModalBtn) cancelCategoryModalBtn.onclick = () => categoryModal.style.display = 'none';
    if (saveCategoryEditBtn) saveCategoryEditBtn.onclick = saveCategoryEdit;

    renderCategoryManagement();
}

// 9-3-1. 카테고리 모달 열기
function openCategoryModal(target, mKey, midKey, subId, label, order, icon = '') {
    editCatTarget.value = target;
    editCatMKey.value = mKey || '';
    editCatMidKey.value = midKey || '';
    editCatSubId.value = subId || '';
    editCatLabel.value = label || '';
    editCatOrder.value = order || 0;
    
    if (target === 'major') {
        majorIconGroup.style.display = 'block';
        editCatIcon.value = icon || 'fa-folder';
        categoryModalTitle.textContent = mKey ? '대분류 수정' : '새 대분류 추가';
    } else if (target === 'middle') {
        majorIconGroup.style.display = 'none';
        categoryModalTitle.textContent = midKey ? '중간분류 수정' : '새 중간분류 추가';
    } else {
        majorIconGroup.style.display = 'none';
        categoryModalTitle.textContent = subId ? '소분류 수정' : '새 소분류 추가';
    }
    
    categoryModal.style.display = 'flex';
}

// 9-3-2. 카테고리 모달 저장
function saveCategoryEdit() {
    const target = editCatTarget.value;
    const mKey = editCatMKey.value;
    const midKey = editCatMidKey.value;
    const subId = editCatSubId.value;
    const label = editCatLabel.value.trim();
    const order = parseInt(editCatOrder.value) || 0;
    const icon = editCatIcon.value.trim();

    if (!label) {
        alert('명칭을 입력해주세요.');
        return;
    }

    if (target === 'major') {
        if (mKey) {
            // 수정
            SITE_CATEGORIES[mKey].label = label;
            SITE_CATEGORIES[mKey].order = order;
            SITE_CATEGORIES[mKey].icon = icon;
        } else {
            // 신규
            const newKey = 'cat_' + Date.now();
            SITE_CATEGORIES[newKey] = { label: label, order: order, icon: icon, middles: {} };
        }
    } else if (target === 'middle') {
        if (midKey) {
            // 수정
            SITE_CATEGORIES[mKey].middles[midKey].label = label;
            SITE_CATEGORIES[mKey].middles[midKey].order = order;
        } else {
            // 신규
            const newMidKey = 'mid_' + Date.now();
            SITE_CATEGORIES[mKey].middles[newMidKey] = { label: label, order: order, subs: [] };
        }
    } else if (target === 'sub') {
        if (subId) {
            // 수정
            const sub = SITE_CATEGORIES[mKey].middles[midKey].subs.find(s => s.id === subId);
            if (sub) {
                sub.label = label;
                sub.order = order;
            }
        } else {
            // 신규
            const newSubId = 'sub_' + Date.now();
            SITE_CATEGORIES[mKey].middles[midKey].subs.push({ id: newSubId, label: label, order: order });
        }
    }

    categoryModal.style.display = 'none';
    renderCategoryManagement();
}

// 9-4. 관리 UI 렌더링
function renderCategoryManagement() {
    const container = document.getElementById('categoryManageContainer');
    if (!container) return;

    if (Object.keys(SITE_CATEGORIES).length === 0) {
        container.innerHTML = '<div class="empty-state">등록된 카테고리가 없습니다.</div>';
        return;
    }

    container.innerHTML = '';
    
    // 대분류 정렬 및 렌더링
    const sortedMajors = Object.keys(SITE_CATEGORIES).sort((a, b) => 
        (SITE_CATEGORIES[a].order || 0) - (SITE_CATEGORIES[b].order || 0)
    );

    for (const mKey of sortedMajors) {
        const major = SITE_CATEGORIES[mKey];
        const card = document.createElement('div');
        card.className = 'major-card';
        card.setAttribute('data-mkey', mKey);
        
        let middlesHtml = '';
        
        // 중간분류 정렬
        const sortedMiddles = Object.keys(major.middles).sort((a, b) => 
            (major.middles[a].order || 0) - (major.middles[b].order || 0)
        );

        for (const midKey of sortedMiddles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            // 소분류 정렬
            const sortedSubs = [...middle.subs].sort((a, b) => 
                (a.order || 0) - (b.order || 0)
            );

            let subsHtml = sortedSubs.map(sub => `
                <span class="sub-badge" data-subid="${sub.id}">
                    <i class="fa-solid fa-grip-vertical drag-handle"></i>
                    <span class="cat-order-badge">${sub.order || 0}</span>
                    <span class="sub-label" onclick="editSubCategory('${mKey}', '${midKey}', '${sub.id}')" title="수정" style="cursor:pointer;">${sub.label}</span>
                    <i class="fa-solid fa-xmark" onclick="deleteSubCategory('${mKey}', '${midKey}', '${sub.id}')" title="삭제" style="margin-left:8px; cursor:pointer; color:#999;"></i>
                </span>
            `).join('');

            middlesHtml += `
                <div class="middle-item" data-midkey="${midKey}">
                    <div class="middle-header">
                        <h4>
                            <i class="fa-solid fa-grip-vertical drag-handle"></i>
                            <span class="cat-order-badge">${middle.order || 0}</span> 
                            <i class="fa-solid fa-chevron-right" style="font-size:0.8rem; opacity:0.5;"></i> ${middle.label}
                        </h4>
                        <div style="display:flex; gap:8px;">
                            <button class="add-mini-btn" onclick="addSubCategory('${mKey}', '${midKey}')"><i class="fa-solid fa-plus"></i> 소분류 추가</button>
                            <button class="action-btn edit" style="font-size:0.85rem; margin:0; color:#3498db;" onclick="editMiddleCategory('${mKey}', '${midKey}')" title="중간분류 수정"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn delete" style="font-size:0.85rem; margin:0;" onclick="deleteMiddleCategory('${mKey}', '${midKey}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="sub-list" data-mkey="${mKey}" data-midkey="${midKey}">
                        ${subsHtml}
                        ${middle.subs.length === 0 ? '<span style="color:#ccc; font-size:0.85rem; padding: 5px;">소분류 없음</span>' : ''}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="major-card-header">
                <h3>
                    <i class="fa-solid fa-grip-vertical drag-handle"></i>
                    <span class="cat-order-badge" style="background:var(--admin-primary); color:#fff;">${major.order || 0}</span> 
                    <i class="fa-solid ${major.icon || 'fa-folder'}"></i> ${major.label}
                </h3>
                <div style="display:flex; gap:8px;">
                    <button class="add-mini-btn" style="color:var(--admin-primary); border-color:var(--admin-primary);" onclick="addMiddleCategory('${mKey}')"><i class="fa-solid fa-plus"></i> 중간분류 추가</button>
                    <button class="action-btn edit" style="margin:0; color:#3498db;" onclick="editMajorCategory('${mKey}')" title="대분류 수정"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" style="margin:0;" onclick="deleteMajorCategory('${mKey}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="major-card-body" data-mkey="${mKey}">
                ${middlesHtml}
                ${Object.keys(major.middles).length === 0 ? '<div style="color:#ccc; text-align:center; padding:30px; font-size:0.9rem;">중간분류가 없습니다.<br>상단의 버튼을 눌러 추가하세요.</div>' : ''}
            </div>
        `;
        container.appendChild(card);
    }

    // Sortable 초기화
    initSortableFeatures();
}

// SortableJS 바인딩 함수
function initSortableFeatures() {
    const container = document.getElementById('categoryManageContainer');
    if (!container || typeof Sortable === 'undefined') return;

    // 1. 대분류 드래그 앤 드롭
    new Sortable(container, {
        handle: '.major-card-header .drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            const cards = container.querySelectorAll('.major-card');
            cards.forEach((card, index) => {
                const mKey = card.getAttribute('data-mkey');
                if (SITE_CATEGORIES[mKey]) {
                    SITE_CATEGORIES[mKey].order = index;
                    card.querySelector('.major-card-header .cat-order-badge').textContent = index;
                }
            });
        }
    });

    // 2. 중간분류 드래그 앤 드롭
    container.querySelectorAll('.major-card-body').forEach(body => {
        new Sortable(body, {
            handle: '.middle-header .drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                const mKey = body.getAttribute('data-mkey');
                const items = body.querySelectorAll('.middle-item');
                items.forEach((item, index) => {
                    const midKey = item.getAttribute('data-midkey');
                    if (SITE_CATEGORIES[mKey].middles[midKey]) {
                        SITE_CATEGORIES[mKey].middles[midKey].order = index;
                        item.querySelector('.middle-header .cat-order-badge').textContent = index;
                    }
                });
            }
        });
    });

    // 3. 소분류 드래그 앤 드롭
    container.querySelectorAll('.sub-list').forEach(list => {
        new Sortable(list, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                const mKey = list.getAttribute('data-mkey');
                const midKey = list.getAttribute('data-midkey');
                const badges = list.querySelectorAll('.sub-badge');
                
                const currentSubs = SITE_CATEGORIES[mKey].middles[midKey].subs;
                const newSubs = [];
                
                badges.forEach((badge, index) => {
                    const subId = badge.getAttribute('data-subid');
                    const sub = currentSubs.find(s => s.id === subId);
                    if (sub) {
                        sub.order = index;
                        badge.querySelector('.cat-order-badge').textContent = index;
                        newSubs.push(sub);
                    }
                });
                SITE_CATEGORIES[mKey].middles[midKey].subs = newSubs;
            }
        });
    });
}

// 9-5. 관리 기능 함수들 (전역 window 객체에 연결)
window.addMiddleCategory = (mKey) => {
    openCategoryModal('middle', mKey, null, null, '', 0);
};

window.deleteMiddleCategory = (mKey, midKey) => {
    if (confirm(`중간분류 "${SITE_CATEGORIES[mKey].middles[midKey].label}"와 하위 소분류를 모두 삭제하시겠습니까?`)) {
        delete SITE_CATEGORIES[mKey].middles[midKey];
        renderCategoryManagement();
    }
};

window.addSubCategory = (mKey, midKey) => {
    openCategoryModal('sub', mKey, midKey, null, '', 0);
};

window.deleteSubCategory = (mKey, midKey, subId) => {
    const middle = SITE_CATEGORIES[mKey].middles[midKey];
    const sub = middle.subs.find(s => s.id === subId);
    if (confirm(`소분류 "${sub.label}"을(를) 삭제하시겠습니까?`)) {
        middle.subs = middle.subs.filter(s => s.id !== subId);
        renderCategoryManagement();
    }
};

window.deleteMajorCategory = (mKey) => {
    if (confirm(`대분류 "${SITE_CATEGORIES[mKey].label}"와 하위의 모든 분류를 삭제하시겠습니까?`)) {
        delete SITE_CATEGORIES[mKey];
        renderCategoryManagement();
    }
};

window.editMajorCategory = (mKey) => {
    const major = SITE_CATEGORIES[mKey];
    openCategoryModal('major', mKey, null, null, major.label, major.order || 0, major.icon || 'fa-folder');
};

window.editMiddleCategory = (mKey, midKey) => {
    const middle = SITE_CATEGORIES[mKey].middles[midKey];
    openCategoryModal('middle', mKey, midKey, null, middle.label, middle.order || 0);
};

window.editSubCategory = (mKey, midKey, subId) => {
    const sub = SITE_CATEGORIES[mKey].middles[midKey].subs.find(s => s.id === subId);
    openCategoryModal('sub', mKey, midKey, subId, sub.label, sub.order || 0);
};

// User Management - Sub Tab Switching
window.switchUserSubTab = function(type) {
    // 탭 버튼 스타일 업데이트
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    // 섹션 표시 업데이트
    document.querySelectorAll('.user-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `user-subtab-${type}`);
    });

    // 데이터 로드
    if (type === 'institution') fetchUsers();
    else if (type === 'profile') fetchProfiles();
}

async function fetchProfiles() {
    const tBody = document.getElementById('profileTableBody');
    if (!tBody) return;

    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">회원 정보를 불러오는 중입니다...</td></tr>';

    // profiles 테이블에서 데이터 가져오기
    const { data: profiles, error } = await db.from('profiles').select('*').order('updated_at', { ascending: false });

    if (error) {
        console.warn('Profiles Table 에러:', error.message);
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger)">데이터를 불러올 수 없습니다. (${error.message})</td></tr>`;
        return;
    }

    if (!profiles || profiles.length === 0) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">가입된 회원이 없습니다.</td></tr>';
        return;
    }

    tBody.innerHTML = '';
    profiles.forEach(p => {
        const tr = document.createElement('tr');
        const dateStr = p.updated_at ? new Date(p.updated_at).toLocaleDateString('ko-KR') : '-';
        
        tr.innerHTML = `
            <td style="font-size:0.8rem; color:#999;">${p.id.substring(0, 8)}</td>
            <td style="font-weight:600;">${p.full_name || '회원'}</td>
            <td>${p.phone || '-'}</td>
            <td>${p.organization || '-'}</td>
            <td><span class="status-badge ${p.user_type === 'business' ? 'process' : ''}">${p.user_type === 'business' ? '기업/기관' : '개인'}</span></td>
            <td style="font-size:0.85rem; color:#666;">${dateStr}</td>
            <td>
                <button class="action-btn" onclick="alert('프로필 상세 보기/수정 기능 준비 중')"><i class="fa-solid fa-eye"></i></button>
                <button class="action-btn delete" onclick="deleteProfile('${p.id}', '${p.full_name}')" title="삭제"><i class="fa-solid fa-user-slash"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

window.deleteProfile = async (id, name) => {
    if (confirm(`"${name}" 회원을 관리 목록에서 제외(삭제)하시겠습니까?\n* 주의: Auth 계정 자체가 삭제되지는 않습니다.`)) {
        const { error } = await db.from('profiles').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchProfiles();
    }
};

// 시스템 초기화는 상단의 DOMContentLoaded 리스너에서 수행됩니다.

window.openPageManage = function(productId) {
    if (typeof switchAdminTab === 'function') {
        switchAdminTab('tab-page-manage');
    } else {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-page-manage').classList.add('active');
        if (typeof initPageManageTab === 'function') initPageManageTab();
    }
    
    const targetSelect = document.getElementById('targetPageId');
    if(targetSelect) {
        const majorFilter = document.getElementById('pageMajorFilter');
        if (majorFilter) {
            majorFilter.value = 'all';
            majorFilter.dispatchEvent(new Event('change'));
        }
        setTimeout(() => {
            targetSelect.value = productId;
            targetSelect.dispatchEvent(new Event('change'));
        }, 100);
    }
};

window.toggleProductDisplay = async function(productId, configKey, isChecked) {
    if (!configKey || configKey === 'null') {
        alert("이 제품의 카테고리 정보가 올바르지 않아 전시 설정을 변경할 수 없습니다.");
        return;
    }

    if (!globalDisplayConfigs[configKey]) {
        globalDisplayConfigs[configKey] = [];
    }

    if (isChecked) {
        if (!globalDisplayConfigs[configKey].includes(productId)) {
            globalDisplayConfigs[configKey].push(productId);
        }
    } else {
        globalDisplayConfigs[configKey] = globalDisplayConfigs[configKey].filter(id => id !== productId);
    }

    const { error } = await db.from('site_configs').upsert({
        key: configKey,
        value: globalDisplayConfigs[configKey]
    });

    if (error) {
        alert('전시 설정 저장 실패: ' + error.message);
        // 상태 롤백
        if (event && event.target) {
            event.target.checked = !isChecked;
        }
        if (isChecked) {
            globalDisplayConfigs[configKey] = globalDisplayConfigs[configKey].filter(id => id !== productId);
        } else {
            globalDisplayConfigs[configKey].push(productId);
        }
    } else {
        // 전시 상태 변경 성공 시, 순서 표시 인풋을 반영하기 위해 테이블을 즉각 새로고침
        fetchProducts(true);
    }
};

window.changeProductDisplayOrder = async function(productId, configKey, newOrderVal, inputElem) {
    if (!configKey || configKey === 'null') return;
    
    let targetIndex = parseInt(newOrderVal) - 1;
    if (isNaN(targetIndex) || targetIndex < 0) {
        alert('올바른 순서 번호를 입력해주세요.');
        if (inputElem) {
            const currentIdx = globalDisplayConfigs[configKey].indexOf(productId) + 1;
            inputElem.value = currentIdx;
        }
        return;
    }
    
    let arr = globalDisplayConfigs[configKey] || [];
    const currentIdx = arr.indexOf(productId);
    if (currentIdx === -1) return; // 전시 중이 아님
    
    if (targetIndex >= arr.length) targetIndex = arr.length - 1;
    
    // 배열 내 위치 재배정 (원래 위치에서 빼고 새로운 위치에 주입)
    arr.splice(currentIdx, 1);
    arr.splice(targetIndex, 0, productId);
    
    globalDisplayConfigs[configKey] = arr;
    
    // DB 업데이트
    const { error } = await db.from('site_configs').upsert({
        key: configKey,
        value: arr
    });
    
    if (error) {
        alert('순서 저장 실패: ' + error.message);
    }
    
    // 테이블 다시 그리기 (다른 상품들의 순서도 자동 동기화 갱신)
    fetchProducts(true);
};

// ==========================================
// 전화 발주 관리 기능
// ==========================================
let globalPhoneOrders = [];

// 1. 전화 발주 목록 조회
window.fetchPhoneOrders = async function() {
    const tableBody = document.getElementById('phoneOrderTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">데이터를 불러오는 중입니다...</td></tr>';

    // orders 테이블에서 customer_name이 [전화]% 인 데이터 필터링하여 조회
    const { data: orders, error } = await db
        .from('orders')
        .select('*')
        .like('customer_name', '[전화]%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('전화 발주 로드 에러:', error);
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color:var(--danger)">전화 발주 내역을 불러올 수 없습니다. (${error.message})</td></tr>`;
        return;
    }

    globalPhoneOrders = orders || [];

    if (globalPhoneOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">등록된 전화 발주 내역이 없습니다.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    globalPhoneOrders.forEach(o => {
        const tr = document.createElement('tr');
        const createdAt = o.created_at ? new Date(o.created_at) : new Date();
        const dateStr = createdAt.toLocaleString('ko-KR');
        const finalPrice = Number(o.total_price) || 0;

        // customer_name 파싱 [전화] 고객명||담당자||메모||파일URL
        let customerName = '익명';
        let managerName = '-';
        let memo = '-';
        let fileLinkHtml = '';
        if (o.customer_name) {
            const parts = o.customer_name.split('||');
            customerName = parts[0].replace('[전화] ', '');
            if (parts.length > 1) managerName = parts[1];
            if (parts.length > 2) memo = parts[2];
            if (parts.length > 3 && parts[3]) {
                const fileUrl = parts[3];
                fileLinkHtml = `<a href="${fileUrl}" target="_blank" style="color: #2980b9; margin-left: 8px; font-size: 0.95rem;" title="첨부파일 보기"><i class="fa-solid fa-paperclip"></i></a>`;
            }
        }

        tr.innerHTML = `
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td style="font-weight:600;">${customerName}</td>
            <td>${o.customer_phone || '-'}</td>
            <td style="font-weight:600; color:#2c3e50;">${o.product_name || '-'}</td>
            <td>${o.quantity || 1}개</td>
            <td style="font-weight:600; color:#e74c3c;">${finalPrice.toLocaleString()}원</td>
            <td style="font-weight:500;">${managerName}</td>
            <td style="font-size:0.85rem; color:#666; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${memo}">${memo}${fileLinkHtml}</td>
        `;
        tableBody.appendChild(tr);
    });
};

// 2. 전화 발주 등록 모달 제어
document.addEventListener('DOMContentLoaded', () => {
    const phoneOrderModal = document.getElementById('phoneOrderModal');
    const addPhoneOrderBtn = document.getElementById('addPhoneOrderBtn');
    const closePhoneOrderModalBtn = document.getElementById('closePhoneOrderModalBtn');
    const cancelPhoneOrderModalBtn = document.getElementById('cancelPhoneOrderModalBtn');
    const savePhoneOrderBtn = document.getElementById('savePhoneOrderBtn');

    const selectProduct = document.getElementById('phoneOrderProduct');
    const originalPriceInput = document.getElementById('phoneOrderOriginalPrice');
    const qtyInput = document.getElementById('phoneOrderQuantity');
    const discountPriceInput = document.getElementById('phoneOrderDiscountPrice');
    const totalPriceInput = document.getElementById('phoneOrderTotalPrice');

    const customerNameInput = document.getElementById('phoneOrderCustomerName');
    const customerPhoneInput = document.getElementById('phoneOrderCustomerPhone');
    const managerNameInput = document.getElementById('phoneOrderManagerName');
    const memoInput = document.getElementById('phoneOrderMemo');
    const fileInput = document.getElementById('phoneOrderFile');
    const msgDiv = document.getElementById('savePhoneOrderMsg');

    if (addPhoneOrderBtn) {
        addPhoneOrderBtn.addEventListener('click', async () => {
            msgDiv.textContent = '';
            
            // 제품 목록 동적 바인딩
            if (!globalProducts || globalProducts.length === 0) {
                if (typeof fetchProducts === 'function') {
                    await fetchProducts();
                }
            }

            selectProduct.innerHTML = '<option value="">제품을 선택해 주세요</option>';
            globalProducts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                // 정상 가격이 숫자 형태인지 또는 '전화문의' 인지 파싱
                opt.dataset.price = p.price;
                opt.dataset.name = p.name;
                selectProduct.appendChild(opt);
            });

            // 폼 초기화
            originalPriceInput.value = '';
            qtyInput.value = 1;
            discountPriceInput.value = '';
            totalPriceInput.value = '0원';
            customerNameInput.value = '';
            customerPhoneInput.value = '';
            managerNameInput.value = '';
            memoInput.value = '';
            if (fileInput) fileInput.value = '';

            phoneOrderModal.style.display = 'flex';
        });
    }

    if (closePhoneOrderModalBtn) closePhoneOrderModalBtn.addEventListener('click', () => phoneOrderModal.style.display = 'none');
    if (cancelPhoneOrderModalBtn) cancelPhoneOrderModalBtn.addEventListener('click', () => phoneOrderModal.style.display = 'none');

    // 제품 선택 변경 시 정상 가격 바인딩 및 할인 가격 기본값 입력
    if (selectProduct) {
        selectProduct.addEventListener('change', () => {
            const selectedOpt = selectProduct.options[selectProduct.selectedIndex];
            if (!selectedOpt || !selectedOpt.value) {
                originalPriceInput.value = '';
                discountPriceInput.value = '';
                calculatePhoneOrderTotal();
                return;
            }

            const rawPrice = selectedOpt.dataset.price || '전화문의';
            originalPriceInput.value = rawPrice;

            // 가격 숫자로 변환 시도
            const numericPrice = parseInt(rawPrice.replace(/[^0-9]/g, ''));
            if (!isNaN(numericPrice)) {
                discountPriceInput.value = numericPrice; // 기본 할인가 = 정상가
            } else {
                discountPriceInput.value = '';
            }
            calculatePhoneOrderTotal();
        });
    }

    // 수량 및 할인 단가 변경 시 최종 결제 금액 계산
    if (qtyInput) qtyInput.addEventListener('input', calculatePhoneOrderTotal);
    if (discountPriceInput) discountPriceInput.addEventListener('input', calculatePhoneOrderTotal);

    function calculatePhoneOrderTotal() {
        const qty = parseInt(qtyInput.value) || 0;
        const discountPrice = parseInt(discountPriceInput.value) || 0;
        const total = qty * discountPrice;
        totalPriceInput.value = total.toLocaleString() + '원';
    }

    // 전화 발주 등록 제출
    if (savePhoneOrderBtn) {
        savePhoneOrderBtn.addEventListener('click', async () => {
            const pid = selectProduct.value;
            const qty = parseInt(qtyInput.value) || 0;
            const discountPrice = parseInt(discountPriceInput.value);
            const customerName = customerNameInput.value.trim();
            const customerPhone = customerPhoneInput.value.trim();
            const managerName = managerNameInput.value.trim();
            const memo = memoInput.value.trim();

            if (!pid) {
                msgDiv.textContent = '발주 제품을 선택해 주세요.'; return;
            }
            if (qty <= 0) {
                msgDiv.textContent = '수량을 1개 이상 입력해 주세요.'; return;
            }
            if (isNaN(discountPrice) || discountPrice < 0) {
                msgDiv.textContent = '올바른 할인 적용 단가를 입력해 주세요.'; return;
            }
            if (!customerName) {
                msgDiv.textContent = '발주처 / 고객명을 입력해 주세요.'; return;
            }
            if (!managerName) {
                msgDiv.textContent = '등록 담당자 성함을 입력해 주세요.'; return;
            }

            savePhoneOrderBtn.textContent = '등록 중...';
            savePhoneOrderBtn.disabled = true;

            const selectedOpt = selectProduct.options[selectProduct.selectedIndex];
            const prodName = selectedOpt.dataset.name;
            const originalPriceStr = selectedOpt.dataset.price || '전화문의';
            const totalPrice = qty * discountPrice;

            try {
                // 0. 파일 업로드 처리
                let uploadedFileUrl = '';
                const file = fileInput && fileInput.files[0];
                if (file) {
                    savePhoneOrderBtn.textContent = '파일 업로드 중...';
                    const ext = file.name.split('.').pop();
                    const filePath = `log-files/${pid}_${Date.now()}.${ext}`;
                    
                    const { error: uploadError } = await db.storage.from('product-images').upload(filePath, file);
                    if (uploadError) {
                        msgDiv.textContent = '파일 업로드 실패: ' + uploadError.message;
                        savePhoneOrderBtn.textContent = '발주 등록하기';
                        savePhoneOrderBtn.disabled = false;
                        return;
                    }
                    
                    const { data: { publicUrl } } = db.storage.from('product-images').getPublicUrl(filePath);
                    uploadedFileUrl = publicUrl;
                }

                // 1. 재고 출고 처리 (inventory_logs insert)
                // 트리거에 의해 products 테이블 stock은 자동 차감됨
                let reasonStr = `[${prodName}] 전화 발주 출고 (정상가: ${originalPriceStr}, 할인가: ${discountPrice.toLocaleString()}원) ${memo ? '- ' + memo : ''}`;
                if (uploadedFileUrl) {
                    reasonStr += `||파일:${uploadedFileUrl}`;
                }
                
                const { error: logError } = await db.from('inventory_logs').insert([{
                    product_id: pid,
                    change_amount: -qty, // 출고는 음수
                    reason: reasonStr,
                    manager_name: managerName
                }]);

                if (logError) throw logError;

                // 2. 주문 등록 처리 (orders insert - 주문 통계 포함 목적)
                // customer_name 에 [전화] 접두사 및 파이프라인 합산
                const dbCustomerName = `[전화] ${customerName}||${managerName}||${memo}||${uploadedFileUrl}`;
                const { error: orderError } = await db.from('orders').insert([{
                    customer_name: dbCustomerName,
                    customer_phone: customerPhone,
                    product_name: prodName,
                    quantity: qty,
                    total_price: totalPrice,
                    status: 'completed'
                }]);

                if (orderError) throw orderError;

                alert('전화 발주가 성공적으로 등록되었습니다.');
                phoneOrderModal.style.display = 'none';

                // 목록 갱신
                fetchPhoneOrders();
                if (typeof fetchProducts === 'function') fetchProducts(); // 재고 갱신 반영을 위해

            } catch (err) {
                console.error('전화 발주 등록 오류:', err);
                msgDiv.textContent = '등록 실패: ' + err.message;
            } finally {
                savePhoneOrderBtn.textContent = '발주 등록하기';
                savePhoneOrderBtn.disabled = false;
            }
        });
    }

    // 엑셀 다운로드 리스너
    const downloadPhoneExcelBtn = document.getElementById('downloadPhoneOrderExcelBtn');
    if (downloadPhoneExcelBtn) {
        downloadPhoneExcelBtn.addEventListener('click', () => {
            if (globalPhoneOrders.length === 0) {
                alert("다운로드할 전화 발주 데이터가 없습니다.");
                return;
            }

            const excelData = globalPhoneOrders.map(o => {
                let customerName = '익명';
                let managerName = '-';
                let memo = '-';
                let fileUrl = '없음';
                if (o.customer_name) {
                    const parts = o.customer_name.split('||');
                    customerName = parts[0].replace('[전화] ', '');
                    if (parts.length > 1) managerName = parts[1];
                    if (parts.length > 2) memo = parts[2];
                    if (parts.length > 3 && parts[3]) fileUrl = parts[3];
                }

                return {
                    "발주 일자 (KST)": new Date(o.created_at).toLocaleString('ko-KR'),
                    "발주처/고객명": customerName,
                    "연락처": o.customer_phone || "미입력",
                    "발주 상품명": o.product_name,
                    "수량": o.quantity,
                    "최종 발주 금액": o.total_price,
                    "등록 담당자": managerName,
                    "메모/비고": memo,
                    "첨부파일 URL": fileUrl
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "전화발주내역");

            const todayStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `SG_LIMU_전화발주내역_${todayStr}.xlsx`);
        });
    }
});
