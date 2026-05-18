// admin.js - Integrated Admin Script
// [MIGRATION] Switched from ES Module to Global Script for local file support.

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

    function applyProductFilters() {
        const query = productSearchInput ? productSearchInput.value.toLowerCase().trim() : '';
        const catValue = categoryFilter ? categoryFilter.value : 'all';

        const filtered = globalProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(query);
            // 검색어에 카테고리 ID가 포함된 경우도 인정
            const categoryMatch = (p.category || '').toLowerCase().includes(query);
            
            // 드롭다운 필터 적용
            const catFilterMatch = (catValue === 'all' || p.category === catValue);
            
            return (nameMatch || categoryMatch) && catFilterMatch;
        });
        renderProductTable(filtered);
    }

    if (productSearchInput) productSearchInput.addEventListener('input', applyProductFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyProductFilters);

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
        loginMessage.textContent = '로그인 실패: ' + error.message;
        loginBtn.textContent = '로그인';
        loginBtn.disabled = false;
    } else {
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
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // 활성화 상태 토글
        navItems.forEach(nav => nav.classList.remove('active'));
        tabPanes.forEach(tab => tab.classList.remove('active'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // 해당 탭 접속 시 데이터 로드
        if(targetId === 'tab-products') {
            fetchProducts();
        } else if(targetId === 'tab-orders') {
            fetchOrders();
        } else if(targetId === 'tab-inquiries') {
            fetchInquiries();
        } else if(targetId === 'tab-banners') {
            switchBannerSubTab('banner');
        } else if(targetId === 'tab-users') {
            switchUserSubTab('institution'); // 기본 서브탭 활성화
        } else if(targetId === 'tab-page-manage') {
            initPageManageTab();
        } else if(targetId === 'tab-category-display') {
            initCategoryDisplayTab();
        } else if(targetId === 'tab-category-manage') {
            initCategoryManageTab();
        }
    });
});

function initDashboard() {
    // 최초 접속 시 제품 관리 탭 로드
    document.querySelector('.nav-item[data-target="tab-products"]').click();
    
    // [신규] 새로운 문의사항이 있는지 미리 확인하여 뱃지 표시
    checkNewInquiries();

    // [신규] 실시간 리스너 설정
    setupRealtimeListeners();
}

// ==========================================
// 3. (기존) 제품 목록 로드 / CRUD 
// ==========================================
async function fetchProducts() {
    productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터를 불러오는 중입니다...</td></tr>';
    
    const { data: products, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching products:', error);
        productTableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> 오류: ${error.message}</td></tr>`;
        return;
    }

    globalProducts = products || [];
    renderProductTable(globalProducts);
    updateProductRelatedUI(globalProducts);
}

// 제품 테이블 렌더링 함수 (검색 필터링 대응)
function renderProductTable(products) {
    if (products.length === 0) {
        productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">등록된 제품이 없거나 검색 결과가 없습니다.</td></tr>';
        return;
    }

    productTableBody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.image_url ? `<img src="${p.image_url}" class="td-img" alt="${p.name}">` : `<div class="td-img" style="background:#eee; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.8rem;">NO IMG</div>`;
        const dateStr = new Date(p.created_at).toLocaleDateString('ko-KR');

        // 카테고리 라벨 매핑 (3단계 대응)
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

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td><span style="background:#eaf2f8; color:#2980b9; padding:3px 8px; border-radius:3px; font-size:0.8rem;">${displayCategory}</span></td>
            <td>${p.price}</td>
            <td>${p.stock}개</td>
            <td style="color:#666; font-size:0.9rem;">${dateStr}</td>
            <td>
                <button class="action-btn edit" onclick="editProduct('${p.id}')" title="수정"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteProduct('${p.id}', '${p.name}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        productTableBody.appendChild(tr);
    });
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
                // 카테고리 라벨 매핑 (3단계 대응)
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

                return `
                <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; transition:background 0.2s;">
                    <input type="checkbox" class="display-item-cb" value="${p.id}" style="transform:scale(1.3); margin-right:5px;">
                    <div style="font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">
                        <span style="color:#2980b9; font-size:0.75rem; font-weight:bold;">[${displayCategory}]</span><br>
                        ${p.name}
                    </div>
                </label>
                `;
            }).join('');
            
            // 카테고리 전시 관리 탭이 활성화된 상태이고 현재 선택된 소분류가 있다면 체크박스 상태 갱신
            if(document.getElementById('tab-category-display').classList.contains('active') && typeof currentSelectedSection !== 'undefined' && currentSelectedSection) {
                loadCategoryDisplay(currentSelectedSection);
            }
        } else {
            displayCheckboxGrid.innerHTML = '<div style="color:#999;">등록된 제품이 없습니다.</div>';
        }
    }
}

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
        targetSelect.innerHTML = filtered.map(p => 
            `<option value="${p.id}">${p.name} (${p.category})</option>`
        ).join('');
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
    div.innerHTML = `
        <input type="text" value="${val}" placeholder="색상명" style="border:none; outline:none; font-size:0.9rem; width:80px;">
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
        <input type="number" value="${price}" placeholder="추가금" style="border:none; outline:none; font-size:0.9rem; width:60px;">
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
        productStockInput.value = '999'; productDescInput.value = ''; productImageUrl.value = ''; productImageFile.value = '';
        imagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
        const colorContainer = document.getElementById('colorContainer');
        if(colorContainer) colorContainer.innerHTML = ''; // 색상 초기화
        const sizeContainer = document.getElementById('sizeContainer');
        if(sizeContainer) sizeContainer.innerHTML = ''; // 사이즈 초기화
    } else {
        modalTitle.textContent = '제품 정보 수정';
    }
    saveMsg.textContent = ''; saveProductBtn.disabled = false; saveProductBtn.textContent = '저장하기';
    modalOverlay.style.display = 'flex';
}
function closeModal() { modalOverlay.style.display = 'none'; }
addProductBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

productImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
        reader.readAsDataURL(file);
    }
});

saveProductBtn.addEventListener('click', async () => {
    const payload = {
        name: productNameInput.value.trim(), category: productCategoryInput.value,
        price: productPriceInput.value.trim(), stock: parseInt(productStockInput.value) || 0,
        description: productDescInput.value.trim(), image_url: productImageUrl.value,
        colors: Array.from(document.querySelectorAll('#colorContainer .color-row input')).map(inp => inp.value).filter(v => v).join(','),
        sizes: Array.from(document.querySelectorAll('#sizeContainer .size-row')).map(row => {
            const inps = row.querySelectorAll('input');
            const name = inps[0].value.trim();
            const price = inps[1].value.trim() || '0';
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
    
    // [폴백 로직] 컬럼이 없을 경우를 대비해 description에도 색상/사이즈 정보 포함 (기존 마커 제거 후 새로 추가)
    const colorTag = `[[C:${payload.colors}]]`;
    const sizeTag = `[[S:${payload.sizes}]]`;
    let cleanDesc = payload.description.replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    const payloadWithDescFallback = { ...payload, description: (cleanDesc + "\n\n" + colorTag + "\n" + sizeTag).trim() };

    let error = null;
    if (id) {
        const { error: updateError } = await db.from('products').update(payload).eq('id', id);
        error = updateError;
        // 컬럼이 없어서 실패한 경우 폴백 실행
        if (error && (error.message.includes("colors") || error.message.includes("sizes"))) {
            console.warn("Falling back to description for colors and sizes...");
            const { colors, sizes, ...fallbackPayload } = payloadWithDescFallback;
            const { error: fallbackError } = await db.from('products').update(fallbackPayload).eq('id', id);
            error = fallbackError;
        }
    } else {
        const { error: insertError } = await db.from('products').insert([payload]);
        error = insertError;
        // 컬럼이 없어서 실패한 경우 폴백 실행
        if (error && (error.message.includes("colors") || error.message.includes("sizes"))) {
            console.warn("Falling back to description for colors and sizes...");
            const { colors, sizes, ...fallbackPayload } = payloadWithDescFallback;
            const { error: fallbackError } = await db.from('products').insert([fallbackPayload]);
            error = fallbackError;
        }
    }

    if (error) {
        saveMsg.textContent = '저장 실패: ' + error.message;
    } else {
        closeModal(); fetchProducts();
    }
    
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = '저장하기';
});

window.editProduct = async (id) => {
    const { data: p, error } = await db.from('products').select('*').eq('id', id).single();
    if (error) { alert("데이터 불러오기 실패"); return; }
    openModal(true);
    productIdInput.value = p.id; productNameInput.value = p.name; productCategoryInput.value = p.category;
    productPriceInput.value = p.price; productStockInput.value = p.stock; 
    
    // 상세 설명 로드 시 색상/사이즈 태그 제거 처리
    productDescInput.value = (p.description || '').replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    
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
        if (error) alert('삭제 실패: ' + error.message); else fetchProducts();
    }
};

// ==========================================
// 4. [신규] 주문 통계 데이터 로드 및 분석 차트
// ==========================================
let orderChartInstance = null;
let revenueChartInstance = null;

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

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">결제/접수된 주문 내역이 없습니다.</td></tr>';
        renderOrderChart([]); // 빈 차트
        document.getElementById('totalOrderCount').textContent = "0건";
        document.getElementById('totalOrderRevenue').textContent = "0원";
        document.getElementById('pendingOrderCount').textContent = "0건";
        return;
    }

    globalOrders = orders; // 엑셀 다운로드용 전역변수
    tableBody.innerHTML = '';
    
    let totalRevenue = 0;
    let pendingCount = 0;

    orders.forEach(o => {
        const tr = document.createElement('tr');
        const createdAt = o.created_at ? new Date(o.created_at) : new Date();
        const dateStr = createdAt.toLocaleString('ko-KR');
        
        // 상태 뱃지 UI
        const status = o.status || 'pending';
        const statusStr = status === 'pending' ? '<span style="color:var(--danger);font-weight:bold;">배송준비</span>' : 
                          status === 'shipped' ? '<span style="color:#3498db;font-weight:bold;">배송진행</span>' : 
                          '<span style="color:var(--success);font-weight:bold;">완료됨</span>';

        const rawPrice = Number(o.total_price) || 0;
        const displayId = o.id ? o.id.toString().substring(0,8).toUpperCase() : 'N/A';

        tr.innerHTML = `
            <td>#${displayId}</td>
            <td style="font-weight:600;">${o.customer_name || '익명'}</td>
            <td>${o.product_name || '정보없음'}</td>
            <td>${o.quantity || 0}개</td>
            <td style="font-weight:600;">${rawPrice.toLocaleString()}원</td>
            <td>${statusStr}</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td><button class="action-btn" title="주문 관리(준비중)"><i class="fa-solid fa-pen"></i></button></td>
        `;
        tableBody.appendChild(tr);

        totalRevenue += rawPrice;
        if(status === 'pending') pendingCount++;
    });

    // 상단 Dashboard 요약창 정보 업데이트
    if(document.getElementById('totalOrderCount')) document.getElementById('totalOrderCount').textContent = orders.length + "건";
    if(document.getElementById('totalOrderRevenue')) document.getElementById('totalOrderRevenue').textContent = totalRevenue.toLocaleString() + "원";
    if(document.getElementById('pendingOrderCount')) document.getElementById('pendingOrderCount').textContent = pendingCount + "건";

    // 분석 차트 렌더링 (건수 및 매출액)
    renderAnalysisCharts(orders);
}

// Chart.js를 사용한 일별 통계 렌더링 (주문 건수 + 매출액)
function renderAnalysisCharts(orders) {
    const orderCanvas = document.getElementById('orderChart');
    const revenueCanvas = document.getElementById('revenueChart');
    if(!orderCanvas || !revenueCanvas) return;
    
    // 최근 7일 라벨 및 데이터 초기화
    const today = new Date();
    today.setHours(0,0,0,0);

    const labels = [];
    const countData = [0, 0, 0, 0, 0, 0, 0];
    const revenueData = [0, 0, 0, 0, 0, 0, 0];

    for(let i=6; i>=0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        labels.push((d.getMonth()+1) + '/' + d.getDate());
    }

    orders.forEach(o => {
        if(!o.created_at) return;
        const orderDate = new Date(o.created_at);
        orderDate.setHours(0,0,0,0);

        const diffTime = today.getTime() - orderDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if(diffDays >= 0 && diffDays < 7) {
            countData[6 - diffDays]++;
            revenueData[6 - diffDays] += Number(o.total_price) || 0;
        }
    });

    // 1. 주문 건수 차트 (막대)
    if(orderChartInstance) orderChartInstance.destroy();
    orderChartInstance = new Chart(orderCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '주문 건수',
                data: countData,
                backgroundColor: 'rgba(142, 195, 66, 0.8)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                label: '매출액 (원)',
                data: revenueData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: { callback: (value) => value.toLocaleString() + '원' }
                } 
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => context.raw.toLocaleString() + '원'
                    }
                }
            }
        }
    });
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
        "고객명/소속": o.customer_name,
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

    grid.innerHTML = globalProducts.map(p => `
        <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; transition:background 0.2s;">
            <input type="checkbox" class="best-item-cb" value="${p.id}" style="transform:scale(1.3); margin-right:5px;">
            <div style="font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">
                <span style="color:#2980b9; font-size:0.75rem; font-weight:bold;">[${p.category}]</span><br>
                ${p.name}
            </div>
        </label>
    `).join('');
    
    // 현재 섹션의 데이터로 체크 상태 복구
    loadBestProductDisplay(currentBestSection);
}

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
    const { data: configData } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionId).single();
    const selectedIds = configData ? configData.value : [];
    
    const checkboxes = document.querySelectorAll('.best-item-cb');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
}

async function saveBestProductDisplay() {
    if (!currentBestSection) return;
    
    const saveBtn = document.getElementById('saveBestDisplayBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

    const checkboxes = document.querySelectorAll('.best-item-cb');
    const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    const { error } = await db.from('site_configs').upsert({
        key: 'display_' + currentBestSection,
        value: selectedIds
    });

    if (error) {
        alert('저장 실패: ' + error.message);
    } else {
        const sectionName = document.getElementById('currentBestSelectionName').innerText;
        alert(`[${sectionName}] 베스트 상품 설정이 저장되었습니다.`);
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
    if(pageMainImage && !pageMainImage.dataset.init) {
        pageMainImage.addEventListener('change', (e) => {
            pageMainImagePreview.innerHTML = '';
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.cssText = "width:80px; height:80px; object-fit:cover; border-radius:4px; border:1px solid #ddd;";
                    pageMainImagePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
        pageMainImage.dataset.init = "true";
    }

    if(pageDetailImage && !pageDetailImage.dataset.init) {
        pageDetailImage.addEventListener('change', (e) => {
            pageDetailImagePreview.innerHTML = '';
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.cssText = "max-width:100%; border-radius:4px; border:1px solid #eee;";
                    pageDetailImagePreview.appendChild(img);
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
                    const inputs = row.querySelectorAll('input');
                    if(inputs[0].value) data.specs.push({ key: inputs[0].value, val: inputs[1].value });
                });
                
                featureContainer.querySelectorAll('.feature-block').forEach(block => {
                    const title = block.querySelector('input').value;
                    const desc = block.querySelector('textarea').value;
                    if(title) data.features.push({ title, desc });
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
    row.style.cssText = "display:flex; gap:10px; align-items:center;";
    row.innerHTML = `
        <input type="text" class="form-control" placeholder="항목명" value="${key}" style="flex:1;">
        <input type="text" class="form-control" placeholder="내용" value="${val}" style="flex:2;">
        <button class="action-btn delete" onclick="this.parentElement.remove()"><i class="fa-solid fa-circle-minus"></i></button>
    `;
    specContainer.appendChild(row);
}

function createFeatureBlock(title, desc) {
    const featureContainer = document.getElementById('featureContainer');
    const block = document.createElement('div');
    block.className = 'feature-block';
    block.style.cssText = "background:#f9f9f9; padding:15px; border-radius:6px; border:1px solid #eee; display:flex; flex-direction:column; gap:8px;";
    block.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <input type="text" class="form-control" placeholder="특징 제목" value="${title}" style="font-weight:bold; width:85%;">
            <button class="action-btn delete" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="form-control" rows="2" placeholder="특징 설명을 입력하세요">${desc}</textarea>
    `;
    featureContainer.appendChild(block);
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
            const img = document.createElement('img');
            img.src = src; img.style.cssText = "width:80px; height:80px; object-fit:cover; border-radius:4px; border:1px solid #ddd;";
            pageMainImagePreview.appendChild(img);
        });
    }
    if(data.detailImages || data.detailImage) {
        pageDetailImagePreview.innerHTML = '';
        const imgs = data.detailImages || [data.detailImage];
        imgs.forEach(src => {
            if(!src) return;
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = "max-width:100%; border-radius:4px; border:1px solid #eee;";
            pageDetailImagePreview.appendChild(img);
        });
    }
    pageDescription.value = data.description || '';
    if(data.specStyle) document.getElementById('specStyle').value = data.specStyle;
    if(data.featureStyle) document.getElementById('featureStyle').value = data.featureStyle;
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
            const checkboxes = document.querySelectorAll('.display-item-cb');
            const selectedProducts = [];
            checkboxes.forEach(cb => {
                if(cb.checked) selectedProducts.push(cb.value);
            });
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
    // [변경] localStorage 대신 Supabase site_configs 테이블에서 로드
    const { data: configData, error } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionKey).single();
    const selectedIds = configData ? configData.value : [];
    
    const checkboxes = document.querySelectorAll('.display-item-cb');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
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

    let html = '<option value="best_product">★ 메인화면 베스트 상품</option>';
    
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
