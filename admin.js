// admin.js - Integrated Admin Script
// [MIGRATION] Switched from ES Module to Global Script for local file support.

let db;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error("Supabase library is not loaded. Please check your internet connection and ensure the CDN script is included in admin.html.");
        alert("Supabase ?쇱대??щ━瑜?遺?ъㅼ? 紐삵?듬?? ?명곕??곌껐? ??명댁＜?몄.");
        return;
    }

    const { createClient } = supabase;

    // ==========================================
    // ???ъ⑹(愿由ъ)?, ?ш린? Supabase ?ㅼ媛? ?ｌ댁＜?몄! ??    // ==========================================
    const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ??ㅽ 珥湲고
    checkSession();

    // ?? 寃? 諛 ???湲곕?    const productSearchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    function applyProductFilters() {
        const query = productSearchInput ? productSearchInput.value.toLowerCase().trim() : '';
        const catValue = categoryFilter ? categoryFilter.value : 'all';

        const filtered = globalProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(query);
            // 寃??댁 移댄怨由?ID媛 ?ы⑤ 寃쎌곕 ?몄
            const categoryMatch = (p.category || '').toLowerCase().includes(query);
            
            // ?濡?ㅼ???????            const catFilterMatch = (catValue === 'all' || p.category === catValue);
            
            return (nameMatch || categoryMatch) && catFilterMatch;
        });
        renderProductTable(filtered);
    }

    if (productSearchInput) productSearchInput.addEventListener('input', applyProductFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyProductFilters);

    // ---------------------------------------------------------
    // ?ㅼ媛 梨? 濡吏 (愿由ъ??怨??)
    // ---------------------------------------------------------
    const adminChatTrigger = document.getElementById('adminChatTrigger');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBody = document.getElementById('chatBody');
    const chatHeaderTitle = chatWindow ? chatWindow.querySelector('.chat-header h4') : null;

    let currentRoomId = null; // ????? 以??怨媛? Room ID
    let chatRooms = []; // ???梨?諛?紐⑸?

    // 1) 梨?李??湲 諛 珥湲고
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

    // 2) 梨?諛?紐⑸? 遺?ъㅺ린 (理洹?硫?吏 湲곗?)
    async function loadChatRooms() {
        const { data, error } = await db
            .from('chat_messages')
            .select('room_id, sender_name, message, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('梨?諛?紐⑸? 濡? ?ㅽ?', error);
            return;
        }

        // 以蹂??嫄고??理? 梨?諛?紐⑸? ???        const seen = new Set();
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

    // 3) 梨?諛?紐⑸? ??留
    function renderRoomList() {
        if (!chatBody) return;
        currentRoomId = null;
        if (chatHeaderTitle) chatHeaderTitle.textContent = '?ㅼ媛 臾몄 紐⑸?';
        
        // ??μ갹 ?④린湲?(紐⑸? 酉곗?? ?? ??)
        if (chatInput) chatInput.parentElement.style.display = 'none';

        chatBody.innerHTML = '';
        if (chatRooms.length === 0) {
            chatBody.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">吏? 以??臾몄媛 ??듬??</div>';
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

    // 4) ?뱀 梨?諛??닿린
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

        chatBody.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">?? ?댁? 遺?ъㅻ 以...</div>';

        const { data, error } = await db
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('?? ?댁 濡? ?ㅽ?', error);
            return;
        }

        chatBody.innerHTML = '';
        data.forEach(msg => {
            renderAdminMessage(msg.message, msg.sender_role === 'admin' ? 'user' : 'system');
        });
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // 5) 硫?吏 ??留 (愿由ъ 梨?李쎌?
    function renderAdminMessage(text, type) {
        if (!chatBody) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type === 'user' ? 'user-msg' : 'system-msg'}`;
        msgDiv.textContent = text;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // 6) ?ㅼ媛 紐⑤ 硫?吏 媛?
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
                
                // 1. ????대ㅼ? 梨?諛⑹ 硫?吏??寃쎌?利? ??留
                if (currentRoomId === newMsg.room_id) {
                    if (newMsg.sender_role === 'customer') {
                        renderAdminMessage(newMsg.message, 'system');
                    }
                } 
                
                // 2. ?泥?紐⑸? 媛깆 (鍮?湲?
                loadChatRooms().then(() => {
                    if (!currentRoomId) renderRoomList();
                });
            })
            .subscribe();
    }

    // 7) 愿由ъ 硫?吏 ???    async function sendAdminMessage() {
        if (!chatInput || !chatBody || !currentRoomId) return;
        const text = chatInput.value.trim();
        if (text === '') return;

        // ?硫?利? ??
        renderAdminMessage(text, 'user');
        chatInput.value = '';

        const { error } = await db
            .from('chat_messages')
            .insert([{
                room_id: currentRoomId,
                sender_role: 'admin',
                sender_name: '愿由ъ',
                message: text
            }]);

        if (error) console.error('愿由ъ 硫?吏 ????ㅽ?', error);
    }

    if (chatSendBtn) chatSendBtn.addEventListener('click', sendAdminMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAdminMessage();
    });
});

// ==========================================
// ?ъ댄??듯?移댄怨由??? (?? 李몄“??
// ==========================================
// ==========================================
// ?ъ댄??듯?移댄怨由??? (?? 蹂?)
// ==========================================
let SITE_CATEGORIES = {}; // DB?? 濡??⑸??
const DEFAULT_CATEGORIES = {
    'system': {
        icon: 'fa-server', label: '??愿由ъ?ㅽ',
        middles: {
            'rfid': { label: 'RFID', subs: [{ id: 'rfid-cat-tag', label: '?洹?(TAG)' }, { id: 'rfid-cat-anti', label: '遺??諛⑹?湲? }, { id: 'rfid-cat-reader', label: '由щ湲? }, { id: 'rfid-cat-return', label: '?異 諛?⑷린' }] },
            'em': { label: 'EM', subs: [{ id: 'em-cat-0', label: '遺??諛⑹?湲? }, { id: 'em-cat-1', label: '媛??嫄곗ъ湲? }, { id: 'em-cat-2', label: '媛? ??댄' }] }
        }
    },
    'supplies': {
        icon: 'fa-box-open', label: '??愿 ?⑺',
        middles: {
            'arrange': { label: '?由?, subs: [{ id: 'supplies-arrange-cat-0', label: '?ㅽ? }, { id: 'supplies-arrange-cat-1', label: '???쇰꺼' }, { id: 'supplies-arrange-cat-2', label: '?쇰꺼?⑹?' }, { id: 'supplies-arrange-cat-3', label: '?κ?' }, { id: 'supplies-arrange-cat-4', label: '??? }, { id: 'supplies-arrange-cat-5', label: '遺?ㅻ' }, { id: 'supplies-arrange-cat-6', label: '湲고' }] },
            'protect': { label: '蹂댄?, subs: [{ id: 'supplies-protect-cat-0', label: '?紐⑥由ъ?' }, { id: 'supplies-protect-cat-1', label: '以?깊' }, { id: 'supplies-protect-cat-2', label: '?硫댄?댄' }, { id: 'supplies-protect-cat-3', label: '遺而ㅻ?' }] },
            'lend': { label: '?異', subs: [{ id: 'supplies-lend-cat-0', label: '諛肄?' }, { id: 'supplies-lend-cat-1', label: '移대?由고?湲곌린' }, { id: 'supplies-lend-cat-2', label: '??利移대' }, { id: 'supplies-lend-cat-3', label: '媛?댁?' }] },
            'etc': { label: '湲고', subs: [{ id: 'sterilizer-cat-0', label: '梨??湲??紐⑦' }] }
        }
    },
    'furniture': {
        icon: 'fa-chair', label: '??愿 媛援?,
        middles: {
            'koas': { label: '肄???, subs: [{ id: 'koas-cat-0', label: '?媛' }, { id: 'koas-cat-1', label: '??대?' }, { id: 'koas-cat-2', label: '??' }, { id: 'koas-cat-3', label: '湲고' }] },
            'fomus': { label: '?щ㉧??, subs: [{ id: 'fomus-cat-0', label: '?媛' }, { id: 'fomus-cat-1', label: '??대?' }, { id: 'fomus-cat-2', label: '??' }, { id: 'fomus-cat-3', label: '湲고' }] },
            'fursys': { label: '?쇱??, subs: [{ id: 'fursys-cat-0', label: '?媛' }, { id: 'fursys-cat-1', label: '??대?' }, { id: 'fursys-cat-2', label: '??' }, { id: 'fursys-cat-3', label: '湲고' }] }
        }
    },
    'signage': {
        icon: 'fa-scroll', label: '?ъ몃Ъ',
        middles: {
            'sign': { label: '?ъ몃Ъ', subs: [{ id: 'sign-class-cat-0', label: '遺瑜/?遺瑜 ?吏?' }, { id: 'sign-board-cat-0', label: '寃??/?댁⑹?? }, { id: 'sign-date-cat-0', label: '?異諛?⑹쇰ν' }, { id: 'sign-custom-cat-0', label: '?? ?ъ몃Ъ' }] }
        }
    },
    'discount': {
        icon: 'fa-tags', label: '??몄?',
        middles: {
            'discount': { label: '?泥?, subs: [{ id: 'discount-cat-0', label: '??몄? ?泥? }] }
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
let globalOrders = []; // ?? ?ㅼ대??瑜?????곗댄곕? 罹?깊? 蹂?
let globalProducts = []; // ?? ?? ?ㅼ대??瑜??? 罹?

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
// 1. 濡洹몄?/ ?몄 愿由?// ==========================================
async function checkSession() {
    const { data: { session }, error } = await db.auth.getSession();
    if (session) {
        loginOverlay.style.display = 'none';
        await fetchCategories(); // 移댄怨由?濡? 異媛
        initDashboard(); // 濡洹몄??깃났 ? ??蹂대 媛? 珥湲고
    } else {
        loginOverlay.style.display = 'flex';
    }
}

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;
    
    if(!email || !password) {
        loginMessage.textContent = '?대??쇨낵 鍮諛踰?몃? ??ν댁＜?몄.';
        return;
    }

    loginBtn.textContent = '濡洹몄?以...';
    loginBtn.disabled = true;

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginMessage.textContent = '濡洹몄??ㅽ? ' + error.message;
        loginBtn.textContent = '濡洹몄?;
        loginBtn.disabled = false;
    } else {
        loginOverlay.style.display = 'none';
        emailInput.value = '';
        passInput.value = '';
        // [FIX] 濡洹몄???? 移댄怨由??蹂?濡? 蹂댁?        await fetchCategories();
        initDashboard();
    }
});

logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut();
    location.reload(); // 源??寃 ?硫??泥??濡怨移?});

// ==========================================
// 2. ?(硫?? ?? ???// ==========================================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // ??깊 ?? ?湲
        navItems.forEach(nav => nav.classList.remove('active'));
        tabPanes.forEach(tab => tab.classList.remove('active'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // ?대?? ?? ? ?곗댄?濡?
        if(targetId === 'tab-products') {
            fetchProducts();
        } else if(targetId === 'tab-orders') {
            fetchOrders();
        } else if(targetId === 'tab-inquiries') {
            fetchInquiries();
        } else if(targetId === 'tab-banners') {
            switchBannerSubTab('banner');
        } else if(targetId === 'tab-users') {
            switchUserSubTab('institution'); // 湲곕낯 ?釉? ??깊
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
    // 理珥 ?? ? ?? 愿由?? 濡?
    document.querySelector('.nav-item[data-target="tab-products"]').click();
    
    // [?洹] ?濡??臾몄?ы????吏 誘몃━ ??명??諭吏 ??
    checkNewInquiries();

    // [?洹] ?ㅼ媛 由ъㅻ ?ㅼ
    setupRealtimeListeners();
}

// ==========================================
// 3. (湲곗〈) ?? 紐⑸? 濡? / CRUD 
// ==========================================
let globalDisplayConfigs = {};

async function fetchDisplayConfigs() {
    const { data, error } = await db.from('site_configs').select('key, value').like('key', 'display_%');
    globalDisplayConfigs = {};
    if (!error && data) {
        data.forEach(row => {
            globalDisplayConfigs[row.key] = Array.isArray(row.value) ? row.value : [];
        });
    }
}

async function fetchProducts() {
    productTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">?곗댄곕? 遺?ъㅻ 以????..</td></tr>';
    
    await fetchDisplayConfigs(); // ?? ?ㅼ 濡?
    
    const { data: products, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching products:', error);
        productTableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> ?ㅻ?: ${error.message}</td></tr>`;
        return;
    }

    globalProducts = products || [];
    renderProductTable(globalProducts);
    updateProductRelatedUI(globalProducts);
}

// ?? ??대? ??留 ?⑥ (寃? ??곕? ??)
function renderProductTable(products) {
    if (products.length === 0) {
        productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">?깅?? ?????嫄곕 寃? 寃곌낵媛 ??듬??</td></tr>';
        return;
    }

    productTableBody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.image_url ? `<img src="${p.image_url}" class="td-img" alt="${p.name}">` : `<div class="td-img" style="background:#eee; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.8rem;">NO IMG</div>`;
        const dateStr = new Date(p.created_at).toLocaleDateString('ko-KR');

        // 移댄怨由??쇰꺼 留ㅽ (3?④? ??)
        let displayCategory = p.category;
        let configKey = null; // ?? ?ㅼ ??        for (const mKey in SITE_CATEGORIES) {
            const major = SITE_CATEGORIES[mKey];
            if (!major || !major.middles) continue;

            for (const midKey in major.middles) {
                const middle = major.middles[midKey];
                if (!middle || !Array.isArray(middle.subs)) continue;

                const sub = middle.subs.find(s => s.id === p.category);
                if (sub) {
                    displayCategory = `${major.label} > ${middle.label} > ${sub.label}`;
                    configKey = `display_${midKey}-${sub.id}`;
                    break;
                }
            }
            if (configKey) break;
        }
        if (p.category === 'best_product') {
            displayCategory = '? 踰?ㅽ???';
            configKey = 'display_best_product';
        }

        const isDisplayed = configKey && globalDisplayConfigs[configKey] && globalDisplayConfigs[configKey].includes(p.id);

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="font-weight:600;"><a href="#" onclick="event.preventDefault(); openPageManage('${p.id}')" style="color:#2980b9; text-decoration:underline; cursor:pointer;" title="??명?댁? 愿由?>${p.name}</a></td>
            <td><span style="background:#eaf2f8; color:#2980b9; padding:3px 8px; border-radius:3px; font-size:0.8rem;">${displayCategory}</span></td>
            <td>${p.price}</td>
            <td>${p.stock}媛</td>
            <td style="color:#666; font-size:0.9rem;">${dateStr}</td>
            <td style="text-align:center;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px; justify-content:center;">
                    <input type="checkbox" style="transform:scale(1.2);" onchange="toggleProductDisplay('${p.id}', '${configKey}', this.checked)" ${isDisplayed ? 'checked' : ''}>
                    <span style="font-size:0.85rem;">??</span>
                </label>
            </td>
            <td>
                <button class="action-btn edit" onclick="editProduct('${p.id}')" title="??"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteProduct('${p.id}', '${p.name}')" title="??"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        productTableBody.appendChild(tr);
    });
}

// ?? ?곗댄곗 ?곕? 湲고 UI ??????곗댄?function updateProductRelatedUI(products) {
    // [媛?] ??명?댁? 愿由??? 珥湲고 諛 ????? 諛?
    renderPageManageProducts();

    // [蹂듦뎄] '移댄怨由??? 愿由? ?? 泥댄щ???洹몃━? ?? ??곗댄?    const displayCheckboxGrid = document.getElementById('productCheckboxGrid');
    if (displayCheckboxGrid) {
        if (products.length > 0) {
            displayCheckboxGrid.innerHTML = products.map(p => {
                // 移댄怨由??쇰꺼 留ㅽ (3?④? ??)
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
                if (p.category === 'best_product') displayCategory = '? 踰?ㅽ???';

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
            
            // 移댄怨由??? 愿由??????깊? ???닿? ?????? ?遺瑜媛 ??ㅻ㈃ 泥댄щ????? 媛깆
            if(document.getElementById('tab-category-display').classList.contains('active') && typeof currentSelectedSection !== 'undefined' && currentSelectedSection) {
                loadCategoryDisplay(currentSelectedSection);
            }
        } else {
            displayCheckboxGrid.innerHTML = '<div style="color:#999;">?깅?? ??????듬??</div>';
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
            if (p.category === 'best_product') displayCategory = '? 踰?ㅽ???';

            return `<option value="${p.id}">${p.name} [${displayCategory}]</option>`;
        }).join('');
        if (document.getElementById('tab-page-manage').classList.contains('active')) {
            targetSelect.dispatchEvent(new Event('change'));
        }
    } else {
        targetSelect.innerHTML = '<option value="">議곌굔? 留? ??????듬??</option>';
    }
}

function old_updateProductRelatedUI(products) {
    const targetSelect = document.getElementById('targetPageId');
    if (targetSelect) {
        if (products.length > 0) {
            targetSelect.innerHTML = products.map(p => 
                `<option value="${p.id}">${p.name} (${p.category})</option>`
            ).join('');
            
            // 留??'??명?댁? 愿由? ?????깊?????ㅻ㈃ 利? ?대깽??諛??耳 ?곗댄?濡?
            if(document.getElementById('tab-page-manage').classList.contains('active')) {
                const event = new Event('change');
                targetSelect.dispatchEvent(event);
            }
        } else {
            targetSelect.innerHTML = '<option value="">?깅?? ??????듬?? 癒쇱 ??? ?깅???몄.</option>';
        }
    }

    // [?洹] '移댄怨由??? 愿由? ?? 泥댄щ???洹몃━? ?? ??곗댄?    const displayCheckboxGrid = document.getElementById('productCheckboxGrid');
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
            
            // 移댄怨由??? 愿由??????깊? ???쇰㈃ 泥댄щ????? 媛깆
            if(document.getElementById('tab-category-display').classList.contains('active')) {
                const secSelect = document.getElementById('targetDisplaySection');
                if(secSelect) secSelect.dispatchEvent(new Event('change'));
            }
        } else {
            displayCheckboxGrid.innerHTML = '<div style="color:#999;">?깅?? ??????듬??</div>';
        }
    }
}

// ?? ?ш? ?? ?ㅼ대?? ?⑥
function downloadProductExcel() {
    if (globalProducts.length === 0) {
        alert('?ㅼ대??? ?? ?곗댄곌? ??듬??');
        return;
    }

    // ??? ?ㅼ닿? ?곗댄??由?    const data = globalProducts.map(p => ({
        '??ID': p.id,
        '??紐': p.name,
        '移댄怨由?: p.category,
        '?留ㅺ?寃?: p.price,
        '??ш??': (p.stock || 0) + '媛',
        '?깅??쇱': new Date(p.created_at).toLocaleString('ko-KR')
    }));

    // SheetJS瑜??ъ⑺???? ???    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "?ш????);

    // 而щ??鍮 議곗
    const wscols = [
        {wch: 20}, // ID
        {wch: 35}, // ??紐
        {wch: 20}, // 移댄怨由?        {wch: 15}, // 媛寃?        {wch: 10}, // ?ш?
        {wch: 25}  // ?깅???    ];
    worksheet['!cols'] = wscols;

    // ????대낫?닿린
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SG_LIMU_?ш????${dateStr}.xlsx`);
}

// ?대깽??由ъㅻ ?깅?
if(downloadProductExcelBtn) {
    downloadProductExcelBtn.addEventListener('click', downloadProductExcel);
}

// ?? ????? ?? ????⑥
function createColorRow(val = '') {
    const container = document.getElementById('colorContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'color-row';
    div.style.cssText = "display:flex; align-items:center; gap:5px; background:#fff; padding:5px 10px; border:1px solid #ddd; border-radius:20px;";
    div.innerHTML = `
        <input type="text" value="${val}" placeholder="??紐" style="border:none; outline:none; font-size:0.9rem; width:80px;">
        <i class="fa-solid fa-xmark" style="cursor:pointer; color:#999; font-size:0.8rem;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(div);
}

// ?? 異媛 踰???대깽??由ъㅻ
const addColorBtn = document.getElementById('addColorBtn');
if (addColorBtn) {
    addColorBtn.addEventListener('click', () => createColorRow(''));
}

// ?ъ댁? ????? ?? ????⑥
function createSizeRow(val = '') {
    const container = document.getElementById('sizeContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'size-row';
    div.style.cssText = "display:flex; align-items:center; gap:5px; background:#fff; padding:5px 10px; border:1px solid #ddd; border-radius:20px;";
    
    // 紐移:湲??遺由????    const parts = val.split(':');
    const name = parts[0] || '';
    const price = parts[1] || '0';

    div.innerHTML = `
        <input type="text" value="${name}" placeholder="?ъ댁?紐" style="border:none; outline:none; font-size:0.9rem; width:80px;">
        <span style="color:#eee">|</span>
        <input type="number" value="${price}" placeholder="異媛湲" style="border:none; outline:none; font-size:0.9rem; width:60px;">
        <i class="fa-solid fa-xmark" style="cursor:pointer; color:#999; font-size:0.8rem;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(div);
}

// ?ъ댁? 異媛 踰???대깽??由ъㅻ
const addSizeBtn = document.getElementById('addSizeBtn');
if (addSizeBtn) {
    addSizeBtn.addEventListener('click', () => createSizeRow(''));
}

// 紐⑤?諛 ?? CRUD 濡吏? 洹몃濡 蹂듭
function openModal(isEdit = false) {
    updateProductModalDropdown(); // ?濡?ㅼ?媛깆
    if (!isEdit) {
        modalTitle.textContent = '? ?? ?깅?';
        productIdInput.value = ''; productNameInput.value = ''; productPriceInput.value = '??臾몄';
        productStockInput.value = '999'; productDescInput.value = ''; productImageUrl.value = ''; productImageFile.value = '';
        imagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
        const colorContainer = document.getElementById('colorContainer');
        if(colorContainer) colorContainer.innerHTML = ''; // ?? 珥湲고
        const sizeContainer = document.getElementById('sizeContainer');
        if(sizeContainer) sizeContainer.innerHTML = ''; // ?ъ댁? 珥湲고
    } else {
        modalTitle.textContent = '?? ?蹂???';
    }
    saveMsg.textContent = ''; saveProductBtn.disabled = false; saveProductBtn.textContent = '??ν湲?;
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
    if (!payload.name) { saveMsg.textContent = '??紐? ??????'; return; }

    saveProductBtn.disabled = true; saveProductBtn.textContent = '???以...';
    const file = productImageFile.files[0];

    // ?ㅽ由ъ? ?濡?
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;
        const { error: uploadError } = await db.storage.from('product-images').upload(filePath, file);
        if (uploadError) { saveMsg.textContent = '?濡? ?ㅻ?: ' + uploadError.message; saveProductBtn.disabled=false; saveProductBtn.textContent='??ν湲?; return; }
        const { data: { publicUrl } } = db.storage.from('product-images').getPublicUrl(filePath);
        payload.image_url = publicUrl;
    }

    const id = productIdInput.value;
    
    // [?대갚 濡吏] 而щ쇱??? 寃쎌곕? ?鍮??description?? ??/?ъ댁? ?蹂??ы?(湲곗〈 留而??嫄?? ?濡 異媛)
    const colorTag = `[[C:${payload.colors}]]`;
    const sizeTag = `[[S:${payload.sizes}]]`;
    let cleanDesc = payload.description.replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    const payloadWithDescFallback = { ...payload, description: (cleanDesc + "\n\n" + colorTag + "\n" + sizeTag).trim() };

    let error = null;
    if (id) {
        const { error: updateError } = await db.from('products').update(payload).eq('id', id);
        error = updateError;
        // 而щ쇱???댁 ?ㅽ⑦ 寃쎌??대갚 ?ㅽ
        if (error && (error.message.includes("colors") || error.message.includes("sizes"))) {
            console.warn("Falling back to description for colors and sizes...");
            const { colors, sizes, ...fallbackPayload } = payloadWithDescFallback;
            const { error: fallbackError } = await db.from('products').update(fallbackPayload).eq('id', id);
            error = fallbackError;
        }
    } else {
        const { error: insertError } = await db.from('products').insert([payload]);
        error = insertError;
        // 而щ쇱???댁 ?ㅽ⑦ 寃쎌??대갚 ?ㅽ
        if (error && (error.message.includes("colors") || error.message.includes("sizes"))) {
            console.warn("Falling back to description for colors and sizes...");
            const { colors, sizes, ...fallbackPayload } = payloadWithDescFallback;
            const { error: fallbackError } = await db.from('products').insert([fallbackPayload]);
            error = fallbackError;
        }
    }

    if (error) {
        saveMsg.textContent = '????ㅽ? ' + error.message;
    } else {
        // [??] ?? 移댄怨由ш? 蹂寃쎈?? ? ??쇰濡 ?ㅻⅨ 移댄怨由ъ ?? ?ㅼ?? ?嫄?        if (id) {
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
            
            // 湲곗〈? ?? 以?댁?ㅻ㈃, ? 移댄怨由ъ? ???쇰? ?? ?? ?吏
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
        
        closeModal(); fetchProducts();
    }
    
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = '??ν湲?;
});

window.editProduct = async (id) => {
    const { data: p, error } = await db.from('products').select('*').eq('id', id).single();
    if (error) { alert("?곗댄?遺?ъㅺ린 ?ㅽ?); return; }
    openModal(true);
    productIdInput.value = p.id; productNameInput.value = p.name; productCategoryInput.value = p.category;
    productPriceInput.value = p.price; productStockInput.value = p.stock; 
    
    // ????ㅻ? 濡? ? ??/?ъ댁? ?洹??嫄?泥由?    productDescInput.value = (p.description || '').replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    
    productImageUrl.value = p.image_url || '';
    imagePreview.innerHTML = p.image_url ? `<img src="${p.image_url}">` : '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
    
    // ??/?ъ댁? ?곗댄?濡? (而щ??곗, ??쇰㈃ description?? ???
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
    if(confirm(`"${name}" ??? ?援?????寃?듬源?`)) {
        const { error } = await db.from('products').delete().eq('id', id);
        if (error) {
            alert('?? ?ㅽ? ' + error.message);
        } else {
            const upsertPromises = [];
            // ?? ?ㅼ??? ??
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
// 4. [?洹] 二쇰Ц ?듦? ?곗댄?濡? 諛 遺? 李⑦?// ==========================================
let orderChartInstance = null;
let revenueChartInstance = null;

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
            <b>'orders'</b> 테이블을 불러올 수 없습니다. (${error.message})
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
    } else {
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
                <td style="font-weight:600;">${o.customer_name || '익명'}</td>
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
    }

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

// SheetJS瑜???⑺ ?? ?ㅼ대?? ?몃━嫄?downloadExcelBtn.addEventListener('click', () => {
    if(globalOrders.length === 0) {
        alert("??濡 ?ㅼ대??? 諛곗?湲곕?/?듦? ?곗댄곌? ??? 議댁ы吏 ??듬??");
        return;
    }

    // ?? ?濡 留???곗댄?媛怨?(?湲 而щ????
    const excelData = globalOrders.map(o => ({
        "??踰??: o.id,
        "怨媛紐/??": o.customer_name,
        "?곕쎌?": o.customer_phone || "誘몄??,
        "二쇰Ц ??紐": o.product_name,
        "援щℓ ??": o.quantity,
        "珥 寃곗/泥援ъ?: o.total_price,
        "泥由???": o.status === 'pending' ? '諛곗≪?鍮以' : o.status === 'shipped' ? '諛곗≪?' : '泥由ъ猷',
        "?? ?쇱 (KST 湲곗?)": new Date(o.created_at).toLocaleString('ko-KR')
    }));

    // 媛? ??щ? 諛 ??????    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "?듦? 吏怨寃곌낵(Orders)");
    
    // ????ㅼ대??
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SG_LIMU_珥二쇰Ц?듦?_${todayStr}.xlsx`);
});

// ==========================================
// 5. 湲고 ?? 湲곕?寃ъ, 諛곕, ??) ?誘?濡? ?⑥
// ==========================================
async function fetchInquiries() {
    const tBody = document.getElementById('inquiryTableBody');
    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">怨媛 臾몄 ?곗댄곕? 遺?ъㅻ 以????..</td></tr>';
    
    const { data: inquiries, error } = await db.from('inquiries').select('*').order('created_at', { ascending: false });

    if(error) {
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;"><i class="fa-solid fa-triangle-exclamation"></i> ??대? 援ъ“ 遺?쇱? ?? 誘몄????ъ???<br>${error.message}</td></tr>`;
        return;
    }
    
    // [?洹] 臾몄 濡? ? 諭吏 ??곗댄?    const openCount = inquiries.filter(inq => inq.status === 'open').length;
    updateInquiryBadge(openCount);

    if(inquiries.length === 0) {
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state">??? 寃ъ/???臾몄 ?댁????듬?? (怨媛? ?곕쎌 湲곕ㅻ━? 以)</td></tr>`;
        return;
    }

    tBody.innerHTML = '';
    inquiries.forEach(inq => {
        const tr = document.createElement('tr');
        const dateStr = new Date(inq.created_at).toLocaleString('ko-KR');
        
        let statusBadge = '';
        if(inq.status === 'open') statusBadge = '<span style="background:#e74c3c;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-circle-exclamation"></i> ?洹??</span>';
        else if(inq.status === 'processing') statusBadge = '<span style="background:#f39c12;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-spinner"></i> ??몄?</span>';
        else statusBadge = '<span style="background:#2ecc71;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-check"></i> ?듬??猷</span>';

        tr.innerHTML = `
            <td>#${inq.id}</td>
            <td style="font-weight:600;">${inq.author}</td>
            <td>${inq.phone}</td>
            <td style="text-align:left; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${inq.title}">${inq.title}</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td>${statusBadge}</td>
            <td>
                <select onchange="updateInquiryStatus('${inq.id}', this.value)" style="padding:5px; border-radius:4px; border:1px solid #ccc; font-size:0.9rem;">
                    <option value="open" ${inq.status === 'open' ? 'selected' : ''}>?湲곗?</option>
                    <option value="processing" ${inq.status === 'processing' ? 'selected' : ''}>???泥由?以</option>
                    <option value="closed" ${inq.status === 'closed' ? 'selected' : ''}>?듬??猷</option>
                </select>
                <button class="action-btn" style="margin-left:10px; color:#3498db" onclick="alert('??怨媛紐/湲곌?: ${inq.author ? inq.author.replace(/'/g, "\\'") : ''}\\n? ?곕쎌?: ${inq.phone || ''}\\n? ???쇱: ${dateStr}\\n\\n? [臾몄 諛 ?泥?댁?\\n${inq.title ? inq.title.replace(/'/g, "\\'") : ''}')" title="?댁??泥대낫湲?><i class="fa-solid fa-envelope-open-text"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

// 臾몄 ?? (?듬??猷 ?? 蹂寃?????⑥ (??)
window.updateInquiryStatus = async function(id, newStatus) {
    const { error } = await db.from('inquiries').update({ status: newStatus }).eq('id', id);
    if (error) {
        alert('?? 蹂寃?以 ?ㅻ?: ' + error.message);
    } else {
        fetchInquiries(); // ?硫??? ?щ???(諭吏 ??곗댄몃 ?ы⑤?
    }
}

// [?洹] ?ъ대諛 臾몄 ?由?諭吏 ??곗댄??⑥
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

// [?洹] 珥湲?濡? ? ?? 二쇨린??쇰? ? 臾몄 ???async function checkNewInquiries() {
    try {
        const { data, error } = await db.from('inquiries').select('id').eq('status', 'open');
        if (!error && data) {
            updateInquiryBadge(data.length);
        }
    } catch (e) {
        console.warn("New inquiry check failed:", e);
    }
}
// [?洹] ?ㅼ媛 DB 蹂寃?媛? (臾몄?ы ?? 媛깆)
function setupRealtimeListeners() {
    if (!db) return;

    // inquiries ??대?? 蹂寃쎌ы? ?ㅼ媛 媛?
    db.channel('inquiries-realtime')
      .on('postgres_changes', { event: '*', table: 'inquiries', schema: 'public' }, (payload) => {
          console.log('Realtime Inquiry Update:', payload);
          // 蹂寃?諛? ? 諭吏 ?? 媛깆
          checkNewInquiries();
          
          // ???臾몄 ?? 蹂닿? ??ㅻ㈃ 由ъㅽ몃 ?? 媛깆
          const activeTab = document.querySelector('.nav-item.active');
          if (activeTab && activeTab.getAttribute('data-target') === 'tab-inquiries') {
              fetchInquiries();
          }
      })
      .subscribe();
}

async function fetchBanners() {
    // banners ??대??? ?곗댄?媛?몄ㅺ린 (?? ?? 湲곗? ?ㅻ?李⑥)
    const { data: banners, error } = await db.from('banners').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false });

    if (error) {
        bannerTableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;">?곗댄곕??댁ㅼ 'banners' ??대?? 癒쇱 ??깊댁＜?몄.<br>${error.message}</td></tr>`;
        return;
    }

    if (banners.length === 0) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">????깅?? 諛곕/??????듬??</td></tr>';
        return;
    }

    bannerTableBody.innerHTML = '';
    banners.forEach(b => {
        const tr = document.createElement('tr');
        const imgHtml = b.image_url ? `<img src="${b.image_url}" class="td-img" style="width:100px; height:auto; object-fit:contain;" alt="諛곕 ?대몄?">` : `<div style="color:#999; font-size:0.8rem;">?대몄? ??</div>`;
        const typeBadge = b.type === 'slide' ? '<span style="background:#3498db; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8rem;">硫???щ쇱대</span>' : '<span style="background:#9b59b6; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8rem;">??李?/span>';
        
        // ?? ?湲 ?ㅼ移 (???鍮???
        const statusHtml = `
            <select onchange="updateBannerStatus('${b.id}', this.value)" style="padding:4px; border-radius:4px; border:1px solid #ccc;">
                <option value="true" ${b.is_active ? 'selected' : ''}>?몄? 以</option>
                <option value="false" ${!b.is_active ? 'selected' : ''}>?④?</option>
            </select>
        `;
        
        const dateStr = new Date(b.created_at).toLocaleDateString('ko-KR');

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${typeBadge}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><a href="${b.link_url || '#'}" target="_blank" style="color:var(--primary); text-decoration:none;">${b.link_url || '??'}</a></td>
            <td style="font-weight:bold;">${b.display_order || 0}</td>
            <td>${dateStr}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn delete" onclick="deleteBanner('${b.id}')" title="??"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        bannerTableBody.appendChild(tr);
    });
}

// ?? 利? ??곗댄??⑥ (??)
window.updateBannerStatus = async function(id, isActiveStr) {
    const isActive = isActiveStr === 'true';
    const { error } = await db.from('banners').update({ is_active: isActive }).eq('id', id);
    if(error) alert('?? 蹂寃??ㅻ?: ' + error.message);
};

window.deleteBanner = async function(id) {
    if(confirm('??諛곕瑜??援ъ?쇰? ????寃?듬源?')) {
        const { error } = await db.from('banners').delete().eq('id', id);
        if(error) alert('?? ?ㅽ? ' + error.message);
        else fetchBanners();
    }
};

// ==========================================
// 6. 諛곕 紐⑤????諛 ?? 濡吏
// ==========================================
function openBannerModal() {
    bannerModalTitle.textContent = '? 諛곕/?? ?깅?';
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
    saveBannerBtn.textContent = '??ν湲?;
    
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
    
    // ? 諛곕 ?깅? ? ?대몄?? ??
    if(!file && !bannerImageUrl.value) {
        saveBannerMsg.textContent = '諛곕 ?대몄?瑜?泥⑤??댁＜?몄.';
        return;
    }

    saveBannerBtn.disabled = true;
    saveBannerBtn.textContent = '???以...';

    const payload = {
        type: bType,
        is_active: isActive,
        link_url: linkUrl || null,
        display_order: displayOrder
    };

    // ?대몄? ????濡? 濡吏 (bucket紐: banner-images)
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `banners/${fileName}`; // ?대 吏? ???
        
        const { error: uploadError } = await db.storage.from('banner-images').upload(filePath, file);
        
        if (uploadError) { 
            saveBannerMsg.textContent = '?대몄? ?濡? ?ㅻ?: ' + uploadError.message; 
            saveBannerBtn.disabled = false; 
            saveBannerBtn.textContent = '??ν湲?; 
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
        saveBannerMsg.textContent = '?깅? ?ㅽ? ' + error.message;
        saveBannerBtn.disabled = false; 
        saveBannerBtn.textContent = '??ν湲?;
    } else {
        closeBannerModal();
        fetchBanners();
    }
});
// ------------------------------------------
// 7. [?洹] 諛곕/?? 愿由????釉 ? 諛 踰?ㅽ??? 愿由?// ------------------------------------------
window.switchBannerSubTab = function(type) {
    // ? 踰???ㅽ????곗댄?    document.querySelectorAll('#tab-banners .sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    // ?뱀 ?? ??곗댄?    document.querySelectorAll('.banner-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `banner-subtab-${type}`);
    });

    // ?곗댄?濡?
    if (type === 'banner') fetchBanners();
    else if (type === 'best') initBestProductManage();
}

let currentBestSection = 'home_best_rfid';
let SITE_BEST_SECTIONS = [];
const DEFAULT_BEST_SECTIONS = [
    { id: 'home_best_rfid', label: 'RFID ??ㅽ' },
    { id: 'home_best_supplies', label: '??愿 ?⑺' },
    { id: 'home_best_furniture', label: '??愿 媛援? },
    { id: 'home_best_sign', label: '?ъ몃Ъ' }
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
    // ?뱀 ?蹂?癒쇱 濡?
    await fetchBestSections();
    renderBestSectionButtons();

    // ?? 紐⑸? 泥댄щ?????留
    if (globalProducts.length === 0) {
        fetchProducts().then(() => renderBestProductCheckboxes());
    } else {
        renderBestProductCheckboxes();
    }

    // ???踰???대깽??    const saveBtn = document.getElementById('saveBestDisplayBtn');
    if (saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = saveBestProductDisplay;
        saveBtn.dataset.init = "true";
    }

    // 珥湲??뱀 濡?
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

// ?뱀 愿由?紐⑤?湲곕?window.openBestSectionModal = function() {
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
            <input type="text" class="form-control" placeholder="?뱀 ID (?臾?" value="${s.id}" style="flex:1;">
            <input type="text" class="form-control" placeholder="?뱀紐 (?湲)" value="${s.label}" style="flex:2;">
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
        <input type="text" class="form-control" placeholder="?뱀 ID (?臾?" style="flex:1;">
        <input type="text" class="form-control" placeholder="?뱀紐 (?湲)" style="flex:2;">
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
        alert('紐⑤ ??瑜?梨?二쇱몄.');
        return;
    }

    const saveBtn = document.getElementById('saveBestSectionBtn');
    saveBtn.disabled = true;
    saveBtn.innerText = '???以...';

    const { error } = await db.from('site_configs').upsert({
        key: 'site_best_sections',
        value: newSections
    });

    if (error) {
        alert('????ㅽ? ' + error.message);
    } else {
        SITE_BEST_SECTIONS = newSections;
        renderBestSectionButtons();
        alert('?뱀 援ъ깆???λ??듬?? 硫????댁??? 諛??⑸??');
        closeBestSectionModal();
    }
    saveBtn.disabled = false;
    saveBtn.innerText = '?ㅼ ???;
}

function renderBestProductCheckboxes() {
    const grid = document.getElementById('bestProductCheckboxGrid');
    if (!grid) return;

    if (globalProducts.length === 0) {
        grid.innerHTML = '<div style="color:#999; text-align:center; width:100%;">?깅?? ??????듬??</div>';
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
    
    // ????뱀? ?곗댄곕? 泥댄??? 蹂듦뎄
    loadBestProductDisplay(currentBestSection);
}

window.selectBestSection = function(sectionId, sectionName) {
    currentBestSection = sectionId;
    
    // 踰???ㅽ????곗댄?    document.querySelectorAll('#bestSectionGrid .minor-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${sectionId}'` || sectionId));
    });

    // ??李???곗댄?    document.getElementById('currentBestSelectionName').innerText = sectionName;

    // ?곗댄?濡?
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
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ???以...';

    const checkboxes = document.querySelectorAll('.best-item-cb');
    const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    const { error } = await db.from('site_configs').upsert({
        key: 'display_' + currentBestSection,
        value: selectedIds
    });

    if (error) {
        alert('????ㅽ? ' + error.message);
    } else {
        const sectionName = document.getElementById('currentBestSelectionName').innerText;
        alert(`[${sectionName}] 踰?ㅽ??? ?ㅼ????λ??듬??`);
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
}

// ------------------------------------------
// 8. [?洹] ??명?댁? 愿由?濡吏 (硫???? ??)
// ------------------------------------------
let currentPageDataKey = ''; // 湲곕낯媛 鍮?? (targetPageId 媛???? ? ??)

function initPageManageTab() {
    const targetSelect = document.getElementById('targetPageId');
    const majorFilter = document.getElementById('pageMajorFilter');
    const middleFilter = document.getElementById('pageMiddleFilter');
    const subFilter = document.getElementById('pageSubFilter');
    
    // 移댄怨由????珥湲고
    if (majorFilter && !majorFilter.dataset.init) {
        // ?遺瑜 梨?곌린
        const sortedMajors = Object.keys(SITE_CATEGORIES).sort((a, b) => (SITE_CATEGORIES[a].order || 0) - (SITE_CATEGORIES[b].order || 0));
        majorFilter.innerHTML = '<option value="all">?泥??遺瑜</option>' + 
            sortedMajors.map(key => `<option value="${key}">${SITE_CATEGORIES[key].label}</option>`).join('');

        majorFilter.addEventListener('change', () => {
            const mKey = majorFilter.value;
            // 以遺瑜 ??곗댄?            if (mKey === 'all') {
                middleFilter.innerHTML = '<option value="all">?泥?以遺瑜</option>';
            } else {
                const major = SITE_CATEGORIES[mKey];
                const sortedMiddles = Object.keys(major.middles).sort((a, b) => (major.middles[a].order || 0) - (major.middles[b].order || 0));
                middleFilter.innerHTML = '<option value="all">?泥?以遺瑜</option>' + 
                    sortedMiddles.map(key => `<option value="${key}">${major.middles[key].label}</option>`).join('');
            }
            subFilter.innerHTML = '<option value="all">?泥??遺瑜</option>';
            renderPageManageProducts();
        });

        middleFilter.addEventListener('change', () => {
            const mKey = majorFilter.value;
            const midKey = middleFilter.value;
            // ?遺瑜 ??곗댄?            if (midKey === 'all') {
                subFilter.innerHTML = '<option value="all">?泥??遺瑜</option>';
            } else {
                const middle = SITE_CATEGORIES[mKey].middles[midKey];
                const sortedSubs = [...middle.subs].sort((a, b) => (a.order || 0) - (b.order || 0));
                subFilter.innerHTML = '<option value="all">?泥??遺瑜</option>' + 
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

    // 1. ?? ?? 蹂寃?? 濡?
    targetSelect.addEventListener('change', (e) => {
        if (!e.target.value) {
            currentPageDataKey = '';
            clearPageManageUI();
            return;
        }
        currentPageDataKey = 'pageData_' + e.target.value;
        loadPageData();
    });

    // 2. ?紐?異媛 踰?쇰?    if(addSpecBtn && !addSpecBtn.dataset.init) {
        addSpecBtn.addEventListener('click', () => createSpecRow('', ''));
        addSpecBtn.dataset.init = "true";
    }
    if(addFeatureBtn && !addFeatureBtn.dataset.init) {
        addFeatureBtn.addEventListener('click', () => createFeatureBlock('', ''));
        addFeatureBtn.dataset.init = "true";
    }

    // 3. ?대몄? 誘몃━蹂닿린 泥由?    if (pageMainImagePreview && typeof Sortable !== 'undefined') {
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
                    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ??';
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

    // [媛?] ?곗댄?URL? Supabase Storage? ?濡??? ?ы??⑥
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
            throw new Error('?대몄? ?濡? 以 ?ㅻ?媛 諛???듬?? ' + err.message);
        }
    }

    // 4. ???踰??    if(savePageBtn && !savePageBtn.dataset.init) {
        savePageBtn.addEventListener('click', async () => {
            if (!targetSelect.value) {
                alert('??? ?? ??? 癒쇱 ????몄.');
                return;
            }

            const originalBtnText = savePageBtn.innerHTML;
            savePageBtn.disabled = true;
            savePageBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ???以...';

            try {
                // 1. ?? ?ъ???泥由?(?洹??寃쎌??濡?)
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

                // 2. ????대몄???泥由?                const detailImageElements = Array.from(pageDetailImagePreview.querySelectorAll('img'));
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
                    detailImages: detailImages, // [蹂寃? ?ㅼ? ?대몄? ??
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
                
                // [蹂寃? localStorage ?? Supabase site_configs ??대?? ???                const { error: configError } = await db.from('site_configs').upsert({
                    key: currentPageDataKey,
                    value: data
                });
                
                if (configError) throw configError;
                
                const productName = targetSelect.options[targetSelect.selectedIndex].text;
                alert(`[${productName}] ??명?댁? ?ㅼ???깃났??쇰? ??λ??듬??`);
                
                // ?濡? ? 誘몃━蹂닿린? src瑜?? URL濡 援泥?(?ㅼ ??ν ? ?ъ濡? 諛⑹?)
                loadPageData(); 

            } catch (error) {
                console.error('Save Error:', error);
                alert('???以 ?ㅻ?媛 諛???듬?? ' + error.message);
            } finally {
                savePageBtn.disabled = false;
                savePageBtn.innerHTML = originalBtnText;
            }
        });
        savePageBtn.dataset.init = "true";
    }

    // 珥湲??곗댄?濡?
    if (targetSelect.value) {
        currentPageDataKey = 'pageData_' + targetSelect.value;
        loadPageData();
    } else {
        // ?? 紐⑸????吏 ?? 寃쎌?        currentPageDataKey = '';
    }
}

function createSpecRow(key, val) {
    const specContainer = document.getElementById('specContainer');
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.style.cssText = "display:flex; gap:10px; align-items:center;";
    row.innerHTML = `
        <input type="text" class="form-control" placeholder="?紐⑸?" value="${key}" style="flex:1;">
        <input type="text" class="form-control" placeholder="?댁? value="${val}" style="flex:2;">
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
            <input type="text" class="form-control" placeholder="?뱀? ?紐? value="${title}" style="font-weight:bold; width:85%;">
            <button class="action-btn delete" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="form-control" rows="2" placeholder="?뱀? ?ㅻ?? ??ν?몄">${desc}</textarea>
    `;
    featureContainer.appendChild(block);
}

async function loadPageData() {
    if(!currentPageDataKey) {
        clearPageManageUI();
        return;
    }

    // [蹂寃? localStorage ?? Supabase site_configs ??대??? 濡?
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
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ??';
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
    
    // ????명? 珥湲고
    if (document.getElementById('pageMainImage')) document.getElementById('pageMainImage').value = '';
    if (document.getElementById('pageDetailImage')) document.getElementById('pageDetailImage').value = '';
}

async function fetchUsers() {
    const tBody = document.getElementById('userTableBody');
    if (!tBody) return;

    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">?? ?蹂대? 遺?ъㅻ 以????..</td></tr>';

    const { data: users, error } = await db.from('users').select('*').order('created_at', { ascending: false });

    if (error) {
        console.warn('Users Table ???', error.message);
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger)">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:10px;"></i><br>
            <b>'users'</b> ??대?? 遺?ъ?? ??듬?? (${error.message})<br>
            <div style="font-size:0.8rem; background:#f9f9f9; padding:10px; margin-top:10px; text-align:left; border-radius:4px;">
                SQL Editor?? ?ㅼ? ?ㅽ??몄:<br>
                <code>CREATE TABLE users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), institution_name text, manager_name text, phone text, email text, discount_rate int DEFAULT 0, memo text, created_at timestamp with time zone DEFAULT now());</code>
            </div>
        </td></tr>`;
        return;
    }

    if (!users || users.length === 0) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">?깅?? 愿由???????듬??</td></tr>';
        return;
    }

    tBody.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : 'N/A';
        
        tr.innerHTML = `
            <td>${u.id.substring(0, 8)}</td>
            <td style="font-weight:600;">${u.institution_name || '誘몄??}</td>
            <td>${u.manager_name || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td style="color:var(--primary); font-weight:bold;">${u.discount_rate || 0}%</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td>
                <button class="action-btn" onclick="editUser('${u.id}')" title="??"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteUser('${u.id}', '${u.institution_name}')" title="??"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

// User Modal Logic
function openUserModal(isEdit = false) {
    if (!isEdit) {
        userModalTitle.textContent = '? ?? ?깅?';
        editUserIdInput.value = '';
        userInstitutionInput.value = '';
        userManagerInput.value = '';
        userPhoneInput.value = '';
        userEmailInput.value = '';
        userDiscountInput.value = '0';
        userMemoInput.value = '';
    } else {
        userModalTitle.textContent = '?? ?蹂???';
    }
    saveUserMsg.textContent = '';
    saveUserBtn.disabled = false;
    saveUserBtn.textContent = '??ν湲?;
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
        saveUserMsg.textContent = '湲곌?紐? ??????';
        return;
    }

    saveUserBtn.disabled = true;
    saveUserBtn.textContent = '???以...';

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
        saveUserMsg.textContent = '????ㅽ? ' + error.message;
        saveUserBtn.disabled = false;
        saveUserBtn.textContent = '??ν湲?;
    } else {
        closeUserModal();
        fetchUsers();
    }
});

window.editUser = async (id) => {
    const { data: u, error } = await db.from('users').select('*').eq('id', id).single();
    if (error) { alert("?곗댄?遺?ъㅺ린 ?ㅽ?); return; }
    
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
    if (confirm(`"${name}" ??? ????寃?듬源?`)) {
        const { error } = await db.from('users').delete().eq('id', id);
        if (error) alert('?? ?ㅽ? ' + error.message);
        else fetchUsers();
    }
};

// 8. [媛?] 移댄怨由??? 愿由?(?泥?移댄怨由??? 諛 UI 怨??)
// ------------------------------------------
// (SITE_CATEGORIES? ??????쇰? ?대??

let currentSelectedSection = ''; // ?????? ?遺瑜 ID

function initCategoryDisplayTab() {
    const minorGrid = document.getElementById('minorCategoryGrid');
    const saveBtn = document.getElementById('saveDisplayBtn');
    const statusBox = document.getElementById('displaySectionStatus');
    const selectionName = document.getElementById('currentSelectionName');

    // (Static majorBtns event binding removed, now handled by renderMajorButtons)

    // 1. ?遺瑜 ??留 諛 ?대깽??諛?몃?    function renderMajorButtons() {
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

        // 珥湲??? (泥?踰吏??遺瑜)
        const firstBtn = majorGrid.querySelector('.major-btn');
        if (firstBtn) firstBtn.click();
    }

    // 2. ?遺瑜 ??留 ?⑥ (3?④? ??)
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
        
        minorGrid.innerHTML = html || '<div style="color:#999; text-align:center; width:100%;">??遺瑜 ??? ?깅?? ?遺瑜媛 ??듬??</div>';
    }

    // 3. ?遺瑜 ?? ?⑥ (?? window 媛泥댁 ?곌껐???onclick ??)
    window.selectMinorCategory = (combinedId, name) => {
        currentSelectedSection = combinedId;
        
        // 踰???ㅽ????곗댄?        document.querySelectorAll('.minor-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${combinedId}'`));
        });

        // ??李???곗댄?        statusBox.style.display = 'block';
        selectionName.innerText = name;

        // 泥댄щ????곗댄?濡?
        loadCategoryDisplay(combinedId);
    };

    // 4. ???踰??    if(saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = async () => {
            if(!currentSelectedSection) {
                alert('癒쇱 愿由ы ?遺瑜(???硫?瑜????댁＜?몄.');
                return;
            }
            const checkboxes = document.querySelectorAll('.display-item-cb');
            const selectedProducts = [];
            checkboxes.forEach(cb => {
                if(cb.checked) selectedProducts.push(cb.value);
            });
            // [蹂寃? localStorage ?? Supabase site_configs ??대?? ???            const { error: displayError } = await db.from('site_configs').upsert({
                key: 'display_' + currentSelectedSection,
                value: selectedProducts
            });

            if (displayError) {
                alert('????ㅽ? ' + displayError.message);
                return;
            }
            alert(`[${selectionName.innerText}] ?硫?諛곗?媛 ?깃났??쇰? ??λ??듬??`);
        };
        saveBtn.dataset.init = "true";
    }

    // 珥湲??ㅽ
    renderMajorButtons();
}

async function loadCategoryDisplay(sectionKey) {
    // [蹂寃? localStorage ?? Supabase site_configs ??대??? 濡?
    const { data: configData, error } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionKey).single();
    const selectedIds = configData ? configData.value : [];
    
    const checkboxes = document.querySelectorAll('.display-item-cb');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
}

// ------------------------------------------
// 9. [?洹] 移댄怨由?援ъ?愿由?(3?④? 怨痢?愿由?
// ------------------------------------------

// 9-1. ?곗댄?濡? 諛 珥湲고
async function fetchCategories() {
    try {
        const { data, error } = await db.from('site_configs').select('value').eq('key', 'site_categories').single();
        if (error || !data) {
            console.log("No site_categories found or error fetching. Initializing with default.");
            SITE_CATEGORIES = DEFAULT_CATEGORIES;
            // 404 ????깆??? 寃쎌??곗댄곌? ?? 寃쎌?留 ??????
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
    // ?곗댄???⑥?理? 蹂댁?    if (!SITE_CATEGORIES || typeof SITE_CATEGORIES !== 'object') {
        SITE_CATEGORIES = DEFAULT_CATEGORIES;
    }
    
    // [?洹] 移댄怨由?????濡?ㅼ?梨?곌린
    populateCategoryFilter();
}

// ?? 愿由??? 移댄怨由?????濡?ㅼ??? ???function populateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    if (!filter) return;

    let html = '<option value="all">?泥?移댄怨由?/option>';
    html += '<option value="best_product">? 踰?ㅽ???</option>';

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

// 9-2. ?? ?깅? 紐⑤ъ 移댄怨由??濡?ㅼ?媛깆
function updateProductModalDropdown() {
    const select = document.getElementById('productCategory');
    if (!select) return;

    let html = '<option value="" disabled selected>湲곕낯 ?? 移댄怨由???</option>';
    html += '<option value="best_product">? 硫?명硫?踰?ㅽ???</option>';
    
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

// 9-3. 移댄怨由?愿由?? 珥湲고
function initCategoryManageTab() {
    const saveBtn = document.getElementById('saveCategoryConfigBtn');
    const addMajorBtn = document.getElementById('addMajorBtn');

    if (saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ???以...';
            const { error } = await db.from('site_configs').upsert({ key: 'site_categories', value: SITE_CATEGORIES });
            if (error) alert("????ㅽ? " + error.message);
            else alert("移댄怨由?援ъ깆??깃났??쇰? ??λ??듬??");
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> ?ㅼ ?援????;
        };
        saveBtn.dataset.init = "true";
    }

    if (addMajorBtn && !addMajorBtn.dataset.init) {
        addMajorBtn.onclick = () => {
            openCategoryModal('major', null, null, null, '? ?遺瑜', 0, 'fa-folder');
        };
        addMajorBtn.dataset.init = "true";
    }

    // 紐⑤??リ린 ?대깽??    if (closeCategoryModalBtn) closeCategoryModalBtn.onclick = () => categoryModal.style.display = 'none';
    if (cancelCategoryModalBtn) cancelCategoryModalBtn.onclick = () => categoryModal.style.display = 'none';
    if (saveCategoryEditBtn) saveCategoryEditBtn.onclick = saveCategoryEdit;

    renderCategoryManagement();
}

// 9-3-1. 移댄怨由?紐⑤??닿린
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
        categoryModalTitle.textContent = mKey ? '?遺瑜 ??' : '? ?遺瑜 異媛';
    } else if (target === 'middle') {
        majorIconGroup.style.display = 'none';
        categoryModalTitle.textContent = midKey ? '以媛遺瑜 ??' : '? 以媛遺瑜 異媛';
    } else {
        majorIconGroup.style.display = 'none';
        categoryModalTitle.textContent = subId ? '?遺瑜 ??' : '? ?遺瑜 異媛';
    }
    
    categoryModal.style.display = 'flex';
}

// 9-3-2. 移댄怨由?紐⑤????function saveCategoryEdit() {
    const target = editCatTarget.value;
    const mKey = editCatMKey.value;
    const midKey = editCatMidKey.value;
    const subId = editCatSubId.value;
    const label = editCatLabel.value.trim();
    const order = parseInt(editCatOrder.value) || 0;
    const icon = editCatIcon.value.trim();

    if (!label) {
        alert('紐移? ??ν댁＜?몄.');
        return;
    }

    if (target === 'major') {
        if (mKey) {
            // ??
            SITE_CATEGORIES[mKey].label = label;
            SITE_CATEGORIES[mKey].order = order;
            SITE_CATEGORIES[mKey].icon = icon;
        } else {
            // ?洹
            const newKey = 'cat_' + Date.now();
            SITE_CATEGORIES[newKey] = { label: label, order: order, icon: icon, middles: {} };
        }
    } else if (target === 'middle') {
        if (midKey) {
            // ??
            SITE_CATEGORIES[mKey].middles[midKey].label = label;
            SITE_CATEGORIES[mKey].middles[midKey].order = order;
        } else {
            // ?洹
            const newMidKey = 'mid_' + Date.now();
            SITE_CATEGORIES[mKey].middles[newMidKey] = { label: label, order: order, subs: [] };
        }
    } else if (target === 'sub') {
        if (subId) {
            // ??
            const sub = SITE_CATEGORIES[mKey].middles[midKey].subs.find(s => s.id === subId);
            if (sub) {
                sub.label = label;
                sub.order = order;
            }
        } else {
            // ?洹
            const newSubId = 'sub_' + Date.now();
            SITE_CATEGORIES[mKey].middles[midKey].subs.push({ id: newSubId, label: label, order: order });
        }
    }

    categoryModal.style.display = 'none';
    renderCategoryManagement();
}

// 9-4. 愿由?UI ??留
function renderCategoryManagement() {
    const container = document.getElementById('categoryManageContainer');
    if (!container) return;

    if (Object.keys(SITE_CATEGORIES).length === 0) {
        container.innerHTML = '<div class="empty-state">?깅?? 移댄怨由ш? ??듬??</div>';
        return;
    }

    container.innerHTML = '';
    
    // ?遺瑜 ???諛 ??留
    const sortedMajors = Object.keys(SITE_CATEGORIES).sort((a, b) => 
        (SITE_CATEGORIES[a].order || 0) - (SITE_CATEGORIES[b].order || 0)
    );

    for (const mKey of sortedMajors) {
        const major = SITE_CATEGORIES[mKey];
        const card = document.createElement('div');
        card.className = 'major-card';
        card.setAttribute('data-mkey', mKey);
        
        let middlesHtml = '';
        
        // 以媛遺瑜 ???        const sortedMiddles = Object.keys(major.middles).sort((a, b) => 
            (major.middles[a].order || 0) - (major.middles[b].order || 0)
        );

        for (const midKey of sortedMiddles) {
            const middle = major.middles[midKey];
            if (!middle || !Array.isArray(middle.subs)) continue;

            // ?遺瑜 ???            const sortedSubs = [...middle.subs].sort((a, b) => 
                (a.order || 0) - (b.order || 0)
            );

            let subsHtml = sortedSubs.map(sub => `
                <span class="sub-badge" data-subid="${sub.id}">
                    <i class="fa-solid fa-grip-vertical drag-handle"></i>
                    <span class="cat-order-badge">${sub.order || 0}</span>
                    <span class="sub-label" onclick="editSubCategory('${mKey}', '${midKey}', '${sub.id}')" title="??" style="cursor:pointer;">${sub.label}</span>
                    <i class="fa-solid fa-xmark" onclick="deleteSubCategory('${mKey}', '${midKey}', '${sub.id}')" title="??" style="margin-left:8px; cursor:pointer; color:#999;"></i>
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
                            <button class="add-mini-btn" onclick="addSubCategory('${mKey}', '${midKey}')"><i class="fa-solid fa-plus"></i> ?遺瑜 異媛</button>
                            <button class="action-btn edit" style="font-size:0.85rem; margin:0; color:#3498db;" onclick="editMiddleCategory('${mKey}', '${midKey}')" title="以媛遺瑜 ??"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn delete" style="font-size:0.85rem; margin:0;" onclick="deleteMiddleCategory('${mKey}', '${midKey}')" title="??"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="sub-list" data-mkey="${mKey}" data-midkey="${midKey}">
                        ${subsHtml}
                        ${middle.subs.length === 0 ? '<span style="color:#ccc; font-size:0.85rem; padding: 5px;">?遺瑜 ??</span>' : ''}
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
                    <button class="add-mini-btn" style="color:var(--admin-primary); border-color:var(--admin-primary);" onclick="addMiddleCategory('${mKey}')"><i class="fa-solid fa-plus"></i> 以媛遺瑜 異媛</button>
                    <button class="action-btn edit" style="margin:0; color:#3498db;" onclick="editMajorCategory('${mKey}')" title="?遺瑜 ??"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" style="margin:0;" onclick="deleteMajorCategory('${mKey}')" title="??"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="major-card-body" data-mkey="${mKey}">
                ${middlesHtml}
                ${Object.keys(major.middles).length === 0 ? '<div style="color:#ccc; text-align:center; padding:30px; font-size:0.9rem;">以媛遺瑜媛 ??듬??<br>??⑥ 踰?쇱 ???異媛??몄.</div>' : ''}
            </div>
        `;
        container.appendChild(card);
    }

    // Sortable 珥湲고
    initSortableFeatures();
}

// SortableJS 諛?몃??⑥
function initSortableFeatures() {
    const container = document.getElementById('categoryManageContainer');
    if (!container || typeof Sortable === 'undefined') return;

    // 1. ?遺瑜 ??洹????濡
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

    // 2. 以媛遺瑜 ??洹????濡
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

    // 3. ?遺瑜 ??洹????濡
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

// 9-5. 愿由?湲곕??⑥??(?? window 媛泥댁 ?곌껐)
window.addMiddleCategory = (mKey) => {
    openCategoryModal('middle', mKey, null, null, '', 0);
};

window.deleteMiddleCategory = (mKey, midKey) => {
    if (confirm(`以媛遺瑜 "${SITE_CATEGORIES[mKey].middles[midKey].label}"? ?? ?遺瑜瑜?紐⑤ ????寃?듬源?`)) {
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
    if (confirm(`?遺瑜 "${sub.label}"?(瑜? ????寃?듬源?`)) {
        middle.subs = middle.subs.filter(s => s.id !== subId);
        renderCategoryManagement();
    }
};

window.deleteMajorCategory = (mKey) => {
    if (confirm(`?遺瑜 "${SITE_CATEGORIES[mKey].label}"? ??? 紐⑤ 遺瑜瑜?????寃?듬源?`)) {
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
    // ? 踰???ㅽ????곗댄?    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    // ?뱀 ?? ??곗댄?    document.querySelectorAll('.user-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `user-subtab-${type}`);
    });

    // ?곗댄?濡?
    if (type === 'institution') fetchUsers();
    else if (type === 'profile') fetchProfiles();
}

async function fetchProfiles() {
    const tBody = document.getElementById('profileTableBody');
    if (!tBody) return;

    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">?? ?蹂대? 遺?ъㅻ 以????..</td></tr>';

    // profiles ??대??? ?곗댄?媛?몄ㅺ린
    const { data: profiles, error } = await db.from('profiles').select('*').order('updated_at', { ascending: false });

    if (error) {
        console.warn('Profiles Table ???', error.message);
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger)">?곗댄곕? 遺?ъ?? ??듬?? (${error.message})</td></tr>`;
        return;
    }

    if (!profiles || profiles.length === 0) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">媛?? ??????듬??</td></tr>';
        return;
    }

    tBody.innerHTML = '';
    profiles.forEach(p => {
        const tr = document.createElement('tr');
        const dateStr = p.updated_at ? new Date(p.updated_at).toLocaleDateString('ko-KR') : '-';
        
        tr.innerHTML = `
            <td style="font-size:0.8rem; color:#999;">${p.id.substring(0, 8)}</td>
            <td style="font-weight:600;">${p.full_name || '??'}</td>
            <td>${p.phone || '-'}</td>
            <td>${p.organization || '-'}</td>
            <td><span class="status-badge ${p.user_type === 'business' ? 'process' : ''}">${p.user_type === 'business' ? '湲곗/湲곌?' : '媛??}</span></td>
            <td style="font-size:0.85rem; color:#666;">${dateStr}</td>
            <td>
                <button class="action-btn" onclick="alert('?濡? ???蹂닿린/?? 湲곕?以鍮 以')"><i class="fa-solid fa-eye"></i></button>
                <button class="action-btn delete" onclick="deleteProfile('${p.id}', '${p.full_name}')" title="??"><i class="fa-solid fa-user-slash"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

window.deleteProfile = async (id, name) => {
    if (confirm(`"${name}" ??? 愿由?紐⑸??? ?????)??寃?듬源?\n* 二쇱: Auth 怨? ?泥닿? ???吏? ??듬??`)) {
        const { error } = await db.from('profiles').delete().eq('id', id);
        if (error) alert('?? ?ㅽ? ' + error.message);
        else fetchProfiles();
    }
};

// ??ㅽ 珥湲고? ??⑥ DOMContentLoaded 由ъㅻ?? ???⑸??

window.openPageManage = function(productId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tab-page-manage').classList.add('active');
    
    if (typeof initPageManageTab === 'function') {
        initPageManageTab();
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
        alert("????? 移댄怨由??蹂닿? ?щ?瑜댁? ?? ?? ?ㅼ? 蹂寃쏀 ? ??듬??");
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
        alert('?? ?ㅼ ????ㅽ? ' + error.message);
        // ?? 濡ㅻ갚
        if (event && event.target) {
            event.target.checked = !isChecked;
        }
        if (isChecked) {
            globalDisplayConfigs[configKey] = globalDisplayConfigs[configKey].filter(id => id !== productId);
        } else {
            globalDisplayConfigs[configKey].push(productId);
        }
    }
};
