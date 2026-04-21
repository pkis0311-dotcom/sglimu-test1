// admin.js - Integrated Admin Script
// [MIGRATION] Switched from ES Module to Global Script for local file support.

let db;

document.addEventListener('DOMContentLoaded', async () => {
    // 0. DOM ?붿냼媛 ?쒕?濡??≫삍?붿? ?뺤씤 (?뱀떆 紐⑤? ?먮윭 諛⑹?)
    if (!loginOverlay) {
        console.error("Critical: UI elements not found!");
        return;
    }

    if (typeof supabase === 'undefined') {
        console.error("Supabase library is not loaded. Please check your internet connection and ensure the CDN script is included in admin.html.");
        alert("Supabase ?쇱씠釉뚮윭由щ? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?명꽣???곌껐???뺤씤?댁＜?몄슂.");
        return;
    }

    const { createClient } = supabase;
    const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ?쒖뒪??珥덇린??    try {
        await checkSession();
    } catch (e) {
        console.error("Session check failed", e);
        // ?몄뀡 泥댄겕 ?ㅽ뙣??濡쒓렇?몄갹 媛뺤젣 ?몄텧
        loginOverlay.style.display = 'flex';
    }
});

// ==========================================
// ?ъ씠???듯빀 移댄뀒怨좊━ ?뺤쓽 (?꾩뿭 李몄“??
// ==========================================
// ==========================================
// 레거시 카테고리 ID 매핑 (이전 데이터 호환성 유지)
// ==========================================
const LEGACY_ID_MAP = {
    'access_7000': 'access-cat-0',
    'access_8000': 'access-cat-1',
    'access_2203': 'access-cat-2',
    'access_2204': 'access-cat-3',
    'discount_items': 'discount-cat-0',
    'sign_date': 'sign-date-cat-0',
    'sign_custom': 'sign-custom-cat-0',
    'sterilizer_parts': 'sterilizer-cat-0',
    'fomus_shelf': 'fomus-cat-0',
    'fomus_table': 'fomus-cat-1',
    'fomus_chair': 'fomus-cat-2',
    'fomus_etc': 'fomus-cat-3',
    'fursys_shelf': 'fursys-cat-0',
    'fursys_table': 'fursys-cat-1',
    'fursys_chair': 'fursys-cat-2',
    'fursys_etc': 'fursys-cat-3',
    'koas_table': 'koas-cat-1',
    'koas_etc': 'koas-cat-3'
};

const SITE_CATEGORIES = {
    'system': {
        icon: 'fa-server', label: '?꾩꽌愿由ъ떆?ㅽ뀥',
        subs: [
            { id: 'rfid_tag', name: 'RFID > ?쒓렇 (TAG)' },
            { id: 'rfid_anti', name: 'RFID > 遺꾩떎 諛⑹?湲? },
            { id: 'rfid_reader', name: 'RFID > 由щ뜑湲? },
            { id: 'rfid_return', name: 'RFID > ?異?諛섎궔湲? },
            { id: 'em_anti', name: 'EM > 遺꾩떎 諛⑹?湲? },
            { id: 'em_gen', name: 'EM > 媛먯쓳?쒓굅?ъ깮湲? },
            { id: 'em_tape', name: 'EM > 媛먯쓳 ?뚯씠?? },
            { id: 'access_7000', name: '異쒖엯愿由?> TNH-7000A' },
            { id: 'access_8000', name: '異쒖엯愿由?> TNH-8000A' },
            { id: 'access_2203', name: '異쒖엯愿由?> EZ-2203AWG' },
            { id: 'access_2204', name: '異쒖엯愿由?> EZ-2204AWG' }
        ]
    },
    'supplies': {
        icon: 'fa-box-open', label: '?꾩꽌愿 ?⑺뭹',
        subs: [
            { id: 'supplies_arrange_keeper', name: '?뺣━ > ?ㅽ띁' },
            { id: 'supplies_arrange_label_color', name: '?뺣━ > ?됰씈?쇰꺼' },
            { id: 'supplies_arrange_label_paper', name: '?뺣━ > ?쇰꺼?⑹?' },
            { id: 'supplies_arrange_gloves', name: '?뺣━ > ?κ컩' },
            { id: 'supplies_arrange_stamp', name: '?뺣━ > ?꾩옣' },
            { id: 'supplies_arrange_bookend', name: '?뺣━ > 遺곸븻?? },
            { id: 'supplies_arrange_etc', name: '?뺣━ > 湲고?' },
            { id: 'supplies_protect_filmo', name: '蹂댄샇 > ?꾨え?쒕━利? },
            { id: 'supplies_protect_glue', name: '蹂댄샇 > 以묒꽦?' },
            { id: 'supplies_protect_tape', name: '蹂댄샇 > ?묐㈃?뚯씠?? },
            { id: 'supplies_protect_bookcover', name: '蹂댄샇 > 遺곸빱踰? },
            { id: 'supplies_lend_barcode', name: '?異?> 諛붿퐫?? },
            { id: 'supplies_lend_equip', name: '?異?> 移대뱶?꾨┛??湲곌린' },
            { id: 'supplies_lend_card', name: '?異?> ?뚯썝利앹뭅?? },
            { id: 'supplies_lend_thermal', name: '?異?> 媛먯뿴吏' },
            { id: 'sterilizer_parts', name: '梨낆냼?낃린 ?뚮え?? }
        ]
    },
    'furniture': {
        icon: 'fa-chair', label: '?꾩꽌愿 媛援?,
        subs: [
            { id: 'koas_shelf', name: '肄붿븘??> ?쒓?' },
            { id: 'koas_table', name: '肄붿븘??> ?뚯씠釉? },
            { id: 'koas_chair', name: '肄붿븘??> ?섏옄' },
            { id: 'koas_etc', name: '肄붿븘??> 湲고?' },
            { id: 'fomus_shelf', name: '?щ㉧??> ?쒓?' },
            { id: 'fomus_table', name: '?щ㉧??> ?뚯씠釉? },
            { id: 'fomus_chair', name: '?щ㉧??> ?섏옄' },
            { id: 'fomus_etc', name: '?щ㉧??> 湲고?' },
            { id: 'fursys_shelf', name: '?쇱떆??> ?쒓?' },
            { id: 'fursys_table', name: '?쇱떆??> ?뚯씠釉? },
            { id: 'fursys_chair', name: '?쇱떆??> ?섏옄' },
            { id: 'fursys_etc', name: '?쇱떆??> 湲고?' }
        ]
    },
    'signage': {
        icon: 'fa-scroll', label: '?ъ씤臾?,
        subs: [
            { id: 'sign_class', name: '遺꾨쪟/?遺꾨쪟 ?쒖??? },
            { id: 'sign_board', name: '寃뚯떆???댁슜?덈궡' },
            { id: 'sign_date', name: '?異쒕컲?⑹씪?ν몴' },
            { id: 'sign_custom', name: '?쒖옉 ?ъ씤臾? },
            { id: 'best_product', name: '硫붿씤 踰좎뒪???곹뭹' }
        ]
    },
    'discount': {
        icon: 'fa-tags', label: '?좎씤?곹뭹',
        subs: [
            { id: 'discount_items', name: '?좎씤?곹뭹 ?꾩껜' }
        ]
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
let globalOrders = []; // ?묒? ?ㅼ슫濡쒕뱶瑜??꾪빐 ?곗씠?곕? 罹먯떛?섎뒗 蹂??let globalProducts = []; // ?쒗뭹 ?묒? ?ㅼ슫濡쒕뱶瑜??꾪븳 罹먯떆

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

// ==========================================
// 1. 濡쒓렇??/ ?몄뀡 愿由?// ==========================================
async function checkSession() {
    const { data: { session }, error } = await db.auth.getSession();
    if (session) {
        loginOverlay.style.display = 'none';
        initDashboard(); // 濡쒓렇???깃났 ????쒕낫??媛뺤젣 珥덇린??    } else {
        loginOverlay.style.display = 'flex';
    }
}

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;
    
    if(!email || !password) {
        loginMessage.textContent = '?대찓?쇨낵 鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂.';
        return;
    }

    loginBtn.textContent = '濡쒓렇??以?..';
    loginBtn.disabled = true;

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginMessage.textContent = '濡쒓렇???ㅽ뙣: ' + error.message;
        loginBtn.textContent = '濡쒓렇??;
        loginBtn.disabled = false;
    } else {
        loginOverlay.style.display = 'none';
        emailInput.value = '';
        passInput.value = '';
        initDashboard();
    }
});

logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut();
    location.reload(); // 源붾걫?섍쾶 ?붾㈃ ?꾩껜 ?덈줈怨좎묠
});

// ==========================================
// 2. ??硫붾돱) ?꾪솚 ?쒖뼱
// ==========================================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // ?쒖꽦???곹깭 ?좉?
        navItems.forEach(nav => nav.classList.remove('active'));
        tabPanes.forEach(tab => tab.classList.remove('active'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // ?대떦 ???묒냽 ???곗씠??濡쒕뱶
        if(targetId === 'tab-products') {
            fetchProducts();
        } else if(targetId === 'tab-orders') {
            fetchOrders();
        } else if(targetId === 'tab-inquiries') {
            fetchInquiries();
        } else if(targetId === 'tab-banners') {
            fetchBanners();
        } else if(targetId === 'tab-users') {
            fetchUsers();
        } else if(targetId === 'tab-page-manage') {
            initPageManageTab();
        } else if(targetId === 'tab-category-display') {
            initCategoryDisplayTab();
        }
    });
});

function initDashboard() {
    // 理쒖큹 ?묒냽 ???쒗뭹 愿由???濡쒕뱶
    document.querySelector('.nav-item[data-target="tab-products"]').click();
}

// ==========================================
// 3. (湲곗〈) ?쒗뭹 紐⑸줉 濡쒕뱶 / CRUD 
// ==========================================
async function fetchProducts() {
    productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">?곗씠?곕? 遺덈윭?ㅻ뒗 以묒엯?덈떎...</td></tr>';
    
    const { data: products, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    globalProducts = products || [];

    if (error) {
        console.error('Error fetching products:', error);
        productTableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> ?ㅻ쪟: ${error.message}</td></tr>`;
        return;
    }

    if (products.length === 0) {
        productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">?깅줉???쒗뭹???놁뒿?덈떎. ???쒗뭹 ?깅줉 踰꾪듉???뚮윭二쇱꽭??</td></tr>';
        return;
    }

    productTableBody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.image_url ? `<img src="${p.image_url}" class="td-img" alt="${p.name}">` : `<div class="td-img" style="background:#eee; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.8rem;">NO IMG</div>`;
        const dateStr = new Date(p.created_at).toLocaleDateString('ko-KR');

        // 移댄뀒怨좊━ ?쇰꺼 留ㅽ븨
        let displayCategory = p.category;
        for (const key in SITE_CATEGORIES) {
            const sub = SITE_CATEGORIES[key].subs.find(s => s.id === p.category);
            if (sub) {
                displayCategory = `${SITE_CATEGORIES[key].label} > ${sub.name.split('>').pop().trim()}`;
                break;
            }
        }
        if (p.category === 'best_product') displayCategory = '??踰좎뒪???곹뭹';

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td><span style="background:#eaf2f8; color:#2980b9; padding:3px 8px; border-radius:3px; font-size:0.8rem;">${displayCategory}</span></td>
            <td>${p.price}</td>
            <td>${p.stock}媛?/td>
            <td style="color:#666; font-size:0.9rem;">${dateStr}</td>
            <td>
                <button class="action-btn edit" onclick="editProduct('${p.id}')" title="?섏젙"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteProduct('${p.id}', '${p.name}')" title="??젣"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        productTableBody.appendChild(tr);
    });

    // [?좉퇋] '?곸꽭?섏씠吏 愿由? ??쓽 Select ?듭뀡???숈쟻?쇰줈 ?낅뜲?댄듃
    const targetSelect = document.getElementById('targetPageId');
    if (targetSelect) {
        if (products.length > 0) {
            targetSelect.innerHTML = products.map(p => 
                `<option value="${p.id}">${p.name} (${p.category})</option>`
            ).join('');
            
            // 留뚯빟 '?곸꽭?섏씠吏 愿由? ??씠 ?쒖꽦?붾릺???덈떎硫?利됱떆 ?대깽??諛쒖깮?쒖폒 ?곗씠??濡쒕뱶
            if(document.getElementById('tab-page-manage').classList.contains('active')) {
                const event = new Event('change');
                targetSelect.dispatchEvent(event);
            }
        } else {
            targetSelect.innerHTML = '<option value="">?깅줉???쒗뭹???놁뒿?덈떎. 癒쇱? ?쒗뭹???깅줉?섏꽭??</option>';
        }
    }

    // [?좉퇋] '移댄뀒怨좊━ ?꾩떆 愿由? ??쓽 泥댄겕諛뺤뒪 洹몃━???숈쟻 ?낅뜲?댄듃
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
            
            // 移댄뀒怨좊━ ?꾩떆 愿由???씠 ?쒖꽦?붾맂 ?곹깭?쇰㈃ 泥댄겕諛뺤뒪 ?곹깭 媛깆떊
            if(document.getElementById('tab-category-display').classList.contains('active')) {
                const secSelect = document.getElementById('targetDisplaySection');
                if(secSelect) secSelect.dispatchEvent(new Event('change'));
            }
        } else {
            displayCheckboxGrid.innerHTML = '<div style="color:#999;">?깅줉???쒗뭹???놁뒿?덈떎.</div>';
        }
    }
}

// ?쒗뭹 ?ш퀬 ?묒? ?ㅼ슫濡쒕뱶 ?⑥닔
function downloadProductExcel() {
    if (globalProducts.length === 0) {
        alert('?ㅼ슫濡쒕뱶???쒗뭹 ?곗씠?곌? ?놁뒿?덈떎.');
        return;
    }

    // ?묒????ㅼ뼱媛??곗씠???뺣━
    const data = globalProducts.map(p => ({
        '?쒗뭹ID': p.id,
        '?쒗뭹紐?: p.name,
        '移댄뀒怨좊━': p.category,
        '?먮ℓ媛寃?: p.price,
        '?꾩옱怨좊웾': (p.stock || 0) + '媛?,
        '?깅줉?쇱떆': new Date(p.created_at).toLocaleString('ko-KR')
    }));

    // SheetJS瑜??ъ슜?섏뿬 ?묒? ?앹꽦
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "?ш퀬?꾪솴");

    // 而щ읆 ?덈퉬 議곗젙
    const wscols = [
        {wch: 20}, // ID
        {wch: 35}, // ?쒗뭹紐?        {wch: 20}, // 移댄뀒怨좊━
        {wch: 15}, // 媛寃?        {wch: 10}, // ?ш퀬
        {wch: 25}  // ?깅줉??    ];
    worksheet['!cols'] = wscols;

    // ?뚯씪 ?대낫?닿린
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SG_LIMU_?ш퀬?꾪솴_${dateStr}.xlsx`);
}

// ?대깽??由ъ뒪???깅줉
if(downloadProductExcelBtn) {
    downloadProductExcelBtn.addEventListener('click', downloadProductExcel);
}

// ?됱긽 ?낅젰 ?꾨뱶 ?숈쟻 ?앹꽦 ?⑥닔
function createColorRow(val = '') {
    const container = document.getElementById('colorContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'color-row';
    div.style.cssText = "display:flex; align-items:center; gap:5px; background:#fff; padding:5px 10px; border:1px solid #ddd; border-radius:20px;";
    div.innerHTML = `
        <input type="text" value="${val}" placeholder="?됱긽紐? style="border:none; outline:none; font-size:0.9rem; width:80px;">
        <i class="fa-solid fa-xmark" style="cursor:pointer; color:#999; font-size:0.8rem;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(div);
}

// ?됱긽 異붽? 踰꾪듉 ?대깽??由ъ뒪??const addColorBtn = document.getElementById('addColorBtn');
if (addColorBtn) {
    addColorBtn.addEventListener('click', () => createColorRow(''));
}

// ?ъ씠利??낅젰 ?꾨뱶 ?숈쟻 ?앹꽦 ?⑥닔
function createSizeRow(val = '') {
    const container = document.getElementById('sizeContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'size-row';
    div.style.cssText = "display:flex; align-items:center; gap:5px; background:#fff; padding:5px 10px; border:1px solid #ddd; border-radius:20px;";
    
    // 紐낆묶:湲덉븸 遺꾨━ ?뚯떛
    const parts = val.split(':');
    const name = parts[0] || '';
    const price = parts[1] || '0';

    div.innerHTML = `
        <input type="text" value="${name}" placeholder="?ъ씠利덈챸" style="border:none; outline:none; font-size:0.9rem; width:80px;">
        <span style="color:#eee">|</span>
        <input type="number" value="${price}" placeholder="異붽?湲? style="border:none; outline:none; font-size:0.9rem; width:60px;">
        <i class="fa-solid fa-xmark" style="cursor:pointer; color:#999; font-size:0.8rem;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(div);
}

// ?ъ씠利?異붽? 踰꾪듉 ?대깽??由ъ뒪??const addSizeBtn = document.getElementById('addSizeBtn');
if (addSizeBtn) {
    addSizeBtn.addEventListener('click', () => createSizeRow(''));
}

// 紐⑤떖 諛??쒗뭹 CRUD 濡쒖쭅? 洹몃?濡?蹂듭썝
function openModal(isEdit = false) {
    if (!isEdit) {
        modalTitle.textContent = '???쒗뭹 ?깅줉';
        productIdInput.value = ''; productNameInput.value = ''; productPriceInput.value = '?꾪솕臾몄쓽';
        productStockInput.value = '999'; productDescInput.value = ''; productImageUrl.value = ''; productImageFile.value = '';
        imagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
        const colorContainer = document.getElementById('colorContainer');
        if(colorContainer) colorContainer.innerHTML = ''; // ?됱긽 珥덇린??        const sizeContainer = document.getElementById('sizeContainer');
        if(sizeContainer) sizeContainer.innerHTML = ''; // ?ъ씠利?珥덇린??    } else {
        modalTitle.textContent = '?쒗뭹 ?뺣낫 ?섏젙';
    }
    saveMsg.textContent = ''; saveProductBtn.disabled = false; saveProductBtn.textContent = '??ν븯湲?;
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
    if (!payload.name) { saveMsg.textContent = '?쒗뭹紐낆? ?꾩닔?낅땲??'; return; }

    saveProductBtn.disabled = true; saveProductBtn.textContent = '???以?..';
    const file = productImageFile.files[0];

    // ?ㅽ넗由ъ? ?낅줈??    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;
        const { error: uploadError } = await db.storage.from('product-images').upload(filePath, file);
        if (uploadError) { saveMsg.textContent = '?낅줈???ㅻ쪟: ' + uploadError.message; saveProductBtn.disabled=false; saveProductBtn.textContent='??ν븯湲?; return; }
        const { data: { publicUrl } } = db.storage.from('product-images').getPublicUrl(filePath);
        payload.image_url = publicUrl;
    }

    const id = productIdInput.value;
    
    // [?대갚 濡쒖쭅] 而щ읆???놁쓣 寃쎌슦瑜??鍮꾪빐 description?먮룄 ?됱긽/?ъ씠利??뺣낫 ?ы븿 (湲곗〈 留덉빱 ?쒓굅 ???덈줈 異붽?)
    const colorTag = `[[C:${payload.colors}]]`;
    const sizeTag = `[[S:${payload.sizes}]]`;
    let cleanDesc = payload.description.replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    const payloadWithDescFallback = { ...payload, description: (cleanDesc + "\n\n" + colorTag + "\n" + sizeTag).trim() };

    let error = null;
    if (id) {
        const { error: updateError } = await db.from('products').update(payload).eq('id', id);
        error = updateError;
        // 而щ읆???놁뼱???ㅽ뙣??寃쎌슦 ?대갚 ?ㅽ뻾
        if (error && (error.message.includes("colors") || error.message.includes("sizes"))) {
            console.warn("Falling back to description for colors and sizes...");
            const { colors, sizes, ...fallbackPayload } = payloadWithDescFallback;
            const { error: fallbackError } = await db.from('products').update(fallbackPayload).eq('id', id);
            error = fallbackError;
        }
    } else {
        const { error: insertError } = await db.from('products').insert([payload]);
        error = insertError;
        // 而щ읆???놁뼱???ㅽ뙣??寃쎌슦 ?대갚 ?ㅽ뻾
        if (error && (error.message.includes("colors") || error.message.includes("sizes"))) {
            console.warn("Falling back to description for colors and sizes...");
            const { colors, sizes, ...fallbackPayload } = payloadWithDescFallback;
            const { error: fallbackError } = await db.from('products').insert([fallbackPayload]);
            error = fallbackError;
        }
    }

    if (error) {
        saveMsg.textContent = '????ㅽ뙣: ' + error.message;
    } else {
        closeModal(); fetchProducts();
    }
    
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = '??ν븯湲?;
});

window.editProduct = async (id) => {
    const { data: p, error } = await db.from('products').select('*').eq('id', id).single();
    if (error) { alert("?곗씠??遺덈윭?ㅺ린 ?ㅽ뙣"); return; }
    openModal(true);
    productIdInput.value = p.id; productNameInput.value = p.name; productCategoryInput.value = p.category;
    productPriceInput.value = p.price; productStockInput.value = p.stock; 
    
    // ?곸꽭 ?ㅻ챸 濡쒕뱶 ???됱긽/?ъ씠利??쒓렇 ?쒓굅 泥섎━
    productDescInput.value = (p.description || '').replace(/\[\[C:.*?\]\]/g, '').replace(/\[\[S:.*?\]\]/g, '').trim();
    
    productImageUrl.value = p.image_url || '';
    imagePreview.innerHTML = p.image_url ? `<img src="${p.image_url}">` : '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
    
    // ?됱긽/?ъ씠利??곗씠??濡쒕뱶 (而щ읆 ?곗꽑, ?놁쑝硫?description?먯꽌 ?뚯떛)
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
    if(confirm(`"${name}" ?쒗뭹???곴뎄 ??젣?섏떆寃좎뒿?덇퉴?`)) {
        const { error } = await db.from('products').delete().eq('id', id);
        if (error) alert('??젣 ?ㅽ뙣: ' + error.message); else fetchProducts();
    }
};

// ==========================================
// 4. [?좉퇋] 二쇰Ц ?듦퀎 ?곗씠??濡쒕뱶 諛?遺꾩꽍 李⑦듃
// ==========================================
let orderChartInstance = null;
let revenueChartInstance = null;

async function fetchOrders() {
    const tableBody = document.getElementById('orderTableBody');
    if(!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">遺꾩꽍 ?곗씠?곕? 遺덈윭?ㅻ뒗 以묒엯?덈떎...</td></tr>';
    
    // orders ?뚯씠釉붿뿉??媛?몄삤湲?    const { data: orders, error } = await db.from('orders').select('*').order('created_at', { ascending: false });

    if (error) {
        console.warn('Orders Table ?먮윭:', error.message);
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color:var(--danger)">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:10px;"></i><br>
            <b>'orders'</b> ?뚯씠釉붿쓣 遺덈윭?????놁뒿?덈떎. (${error.message})<br>
            <div style="font-size:0.8rem; background:#f9f9f9; padding:10px; margin-top:10px; text-align:left; border-radius:4px;">
                SQL Editor?먯꽌 ?ㅼ쓬???ㅽ뻾?섏꽭??<br>
                <code>CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), customer_name text, product_name text, total_price int, status text, created_at timestamp with time zone DEFAULT now());</code>
            </div>
        </td></tr>`;
        return;
    }

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">寃곗젣/?묒닔??二쇰Ц ?댁뿭???놁뒿?덈떎.</td></tr>';
        renderOrderChart([]); // 鍮?李⑦듃
        document.getElementById('totalOrderCount').textContent = "0嫄?;
        document.getElementById('totalOrderRevenue').textContent = "0??;
        document.getElementById('pendingOrderCount').textContent = "0嫄?;
        return;
    }

    globalOrders = orders; // ?묒? ?ㅼ슫濡쒕뱶???꾩뿭蹂??    tableBody.innerHTML = '';
    
    let totalRevenue = 0;
    let pendingCount = 0;

    orders.forEach(o => {
        const tr = document.createElement('tr');
        const createdAt = o.created_at ? new Date(o.created_at) : new Date();
        const dateStr = createdAt.toLocaleString('ko-KR');
        
        // ?곹깭 諭껋? UI
        const status = o.status || 'pending';
        const statusStr = status === 'pending' ? '<span style="color:var(--danger);font-weight:bold;">諛곗넚以鍮?/span>' : 
                          status === 'shipped' ? '<span style="color:#3498db;font-weight:bold;">諛곗넚吏꾪뻾</span>' : 
                          '<span style="color:var(--success);font-weight:bold;">?꾨즺??/span>';

        const rawPrice = Number(o.total_price) || 0;
        const displayId = o.id ? o.id.toString().substring(0,8).toUpperCase() : 'N/A';

        tr.innerHTML = `
            <td>#${displayId}</td>
            <td style="font-weight:600;">${o.customer_name || '?듬챸'}</td>
            <td>${o.product_name || '?뺣낫?놁쓬'}</td>
            <td>${o.quantity || 0}媛?/td>
            <td style="font-weight:600;">${rawPrice.toLocaleString()}??/td>
            <td>${statusStr}</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td><button class="action-btn" title="二쇰Ц 愿由?以鍮꾩쨷)"><i class="fa-solid fa-pen"></i></button></td>
        `;
        tableBody.appendChild(tr);

        totalRevenue += rawPrice;
        if(status === 'pending') pendingCount++;
    });

    // ?곷떒 Dashboard ?붿빟李??뺣낫 ?낅뜲?댄듃
    if(document.getElementById('totalOrderCount')) document.getElementById('totalOrderCount').textContent = orders.length + "嫄?;
    if(document.getElementById('totalOrderRevenue')) document.getElementById('totalOrderRevenue').textContent = totalRevenue.toLocaleString() + "??;
    if(document.getElementById('pendingOrderCount')) document.getElementById('pendingOrderCount').textContent = pendingCount + "嫄?;

    // 遺꾩꽍 李⑦듃 ?뚮뜑留?(嫄댁닔 諛?留ㅼ텧??
    renderAnalysisCharts(orders);
}

// Chart.js瑜??ъ슜???쇰퀎 ?듦퀎 ?뚮뜑留?(二쇰Ц 嫄댁닔 + 留ㅼ텧??
function renderAnalysisCharts(orders) {
    const orderCanvas = document.getElementById('orderChart');
    const revenueCanvas = document.getElementById('revenueChart');
    if(!orderCanvas || !revenueCanvas) return;
    
    // 理쒓렐 7???쇰꺼 諛??곗씠??珥덇린??    const today = new Date();
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

    // 1. 二쇰Ц 嫄댁닔 李⑦듃 (留됰?)
    if(orderChartInstance) orderChartInstance.destroy();
    orderChartInstance = new Chart(orderCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '二쇰Ц 嫄댁닔',
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

    // 2. 留ㅼ텧??異붿씠 李⑦듃 (?쇱씤)
    if(revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(revenueCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '留ㅼ텧??(??',
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
                    ticks: { callback: (value) => value.toLocaleString() + '?? }
                } 
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => context.raw.toLocaleString() + '??
                    }
                }
            }
        }
    });
}

// SheetJS瑜??쒖슜???묒? ?ㅼ슫濡쒕뱶 ?몃━嫄?downloadExcelBtn.addEventListener('click', () => {
    if(globalOrders.length === 0) {
        alert("?묒?濡??ㅼ슫濡쒕뱶??諛곗넚 湲곕줉/?듦퀎 ?곗씠?곌? ?섎굹??議댁옱?섏? ?딆뒿?덈떎.");
        return;
    }

    // ?묒? ?쒕줈 留뚮뱾 ?곗씠??媛怨?(?쒓? 而щ읆 ?곸슜)
    const excelData = globalOrders.map(o => ({
        "?묒닔踰덊샇": o.id,
        "怨좉컼紐??뚯냽": o.customer_name,
        "?곕씫泥?: o.customer_phone || "誘몄엯??,
        "二쇰Ц ?곹뭹紐?: o.product_name,
        "援щℓ ?섎웾": o.quantity,
        "珥?寃곗젣/泥?뎄??: o.total_price,
        "泥섎━ ?곹깭": o.status === 'pending' ? '諛곗넚以鍮꾩쨷' : o.status === 'shipped' ? '諛곗넚以? : '泥섎━?꾨즺',
        "?묒닔 ?쇱옄 (KST 湲곗?)": new Date(o.created_at).toLocaleString('ko-KR')
    }));

    // 媛???뚰겕遺?諛??쒗듃 ?앹꽦
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "?듦퀎 吏묎퀎寃곌낵(Orders)");
    
    // ?뚯씪 ?ㅼ슫濡쒕뱶
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SG_LIMU_珥앹＜臾명넻怨?${todayStr}.xlsx`);
});

// ==========================================
// 5. 湲고? ?쒖븞 湲곕뒫(寃ъ쟻, 諛곕꼫, ?뚯썝) ?붾? 濡쒕뱶 ?⑥닔
// ==========================================
async function fetchInquiries() {
    const tBody = document.getElementById('inquiryTableBody');
    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">怨좉컼 臾몄쓽 ?곗씠?곕? 遺덈윭?ㅻ뒗 以묒엯?덈떎...</td></tr>';
    
    const { data: inquiries, error } = await db.from('inquiries').select('*').order('created_at', { ascending: false });

    if(error) {
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;"><i class="fa-solid fa-triangle-exclamation"></i> ?뚯씠釉?援ъ“ 遺덉씪移??먮뒗 誘몄깮???먮윭?낅땲??<br>${error.message}</td></tr>`;
        return;
    }

    if(inquiries.length === 0) {
        tBody.innerHTML = `<tr><td colspan="7" class="empty-state">?묒닔??寃ъ쟻/?곷떞 臾몄쓽 ?댁뿭???놁뒿?덈떎. (怨좉컼???곕씫??湲곕떎由щ뒗 以?</td></tr>`;
        return;
    }

    tBody.innerHTML = '';
    inquiries.forEach(inq => {
        const tr = document.createElement('tr');
        const dateStr = new Date(inq.created_at).toLocaleString('ko-KR');
        
        let statusBadge = '';
        if(inq.status === 'open') statusBadge = '<span style="background:#e74c3c;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-circle-exclamation"></i> ?좉퇋?묒닔</span>';
        else if(inq.status === 'processing') statusBadge = '<span style="background:#f39c12;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-spinner"></i> ?뺤씤以?/span>';
        else statusBadge = '<span style="background:#2ecc71;color:#fff;padding:4px 8px;border-radius:12px;font-size:0.8rem;"><i class="fa-solid fa-check"></i> ?듬??꾨즺</span>';

        tr.innerHTML = `
            <td>#${inq.id}</td>
            <td style="font-weight:600;">${inq.author}</td>
            <td>${inq.phone}</td>
            <td style="text-align:left; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${inq.title}">${inq.title}</td>
            <td style="font-size:0.9rem; color:#666;">${dateStr}</td>
            <td>${statusBadge}</td>
            <td>
                <select onchange="updateInquiryStatus(${inq.id}, this.value)" style="padding:5px; border-radius:4px; border:1px solid #ccc; font-size:0.9rem;">
                    <option value="open" ${inq.status === 'open' ? 'selected' : ''}>?湲곗쨷</option>
                    <option value="processing" ${inq.status === 'processing' ? 'selected' : ''}>?뺤씤(泥섎━)以?/option>
                    <option value="closed" ${inq.status === 'closed' ? 'selected' : ''}>?듬??꾨즺</option>
                </select>
                <button class="action-btn" style="margin-left:10px; color:#3498db" onclick="alert('?뫀 怨좉컼紐?湲곌?: ${inq.author}\\n?뱸 ?곕씫泥? ${inq.phone}\\n?븩 ?묒닔?쇱떆: ${dateStr}\\n\\n?뱥 [臾몄쓽 諛??붿껌?댁슜]\\n${inq.title.replace(/'/g, "\\'")}')" title="?댁슜 ?꾩껜蹂닿린"><i class="fa-solid fa-envelope-open-text"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

// 臾몄쓽 ?곹깭 (?듬??꾨즺 ?? 蹂寃?????⑥닔 (?꾩뿭)
window.updateInquiryStatus = async function(id, newStatus) {
    const { error } = await db.from('inquiries').update({ status: newStatus }).eq('id', id);
    if (error) {
        alert('?곹깭 蹂寃?以??ㅻ쪟: ' + error.message);
    } else {
        fetchInquiries(); // ?붾㈃ ?먮룞 ?щ줈??    }
}
async function fetchBanners() {
    // banners ?뚯씠釉붿뿉???곗씠??媛?몄삤湲?(?쒖꽌 ?꾨뱶 湲곗? ?ㅻ쫫李⑥닚)
    const { data: banners, error } = await db.from('banners').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false });

    if (error) {
        bannerTableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;">?곗씠?곕쿋?댁뒪??'banners' ?뚯씠釉붿쓣 癒쇱? ?앹꽦?댁＜?몄슂.<br>${error.message}</td></tr>`;
        return;
    }

    if (banners.length === 0) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">?꾩옱 ?깅줉??諛곕꼫/?앹뾽???놁뒿?덈떎.</td></tr>';
        return;
    }

    bannerTableBody.innerHTML = '';
    banners.forEach(b => {
        const tr = document.createElement('tr');
        const imgHtml = b.image_url ? `<img src="${b.image_url}" class="td-img" style="width:100px; height:auto; object-fit:contain;" alt="諛곕꼫 ?대?吏">` : `<div style="color:#999; font-size:0.8rem;">?대?吏 ?놁쓬</div>`;
        const typeBadge = b.type === 'slide' ? '<span style="background:#3498db; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8rem;">硫붿씤 ?щ씪?대뱶</span>' : '<span style="background:#9b59b6; color:#fff; padding:3px 8px; border-radius:3px; font-size:0.8rem;">?앹뾽李?/span>';
        
        // ?곹깭 ?좉? ?ㅼ쐞移?(?쒖꽦/鍮꾪솢??
        const statusHtml = `
            <select onchange="updateBannerStatus('${b.id}', this.value)" style="padding:4px; border-radius:4px; border:1px solid #ccc;">
                <option value="true" ${b.is_active ? 'selected' : ''}>?몄텧 以?/option>
                <option value="false" ${!b.is_active ? 'selected' : ''}>?④?</option>
            </select>
        `;
        
        const dateStr = new Date(b.created_at).toLocaleDateString('ko-KR');

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${typeBadge}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><a href="${b.link_url || '#'}" target="_blank" style="color:var(--primary); text-decoration:none;">${b.link_url || '?놁쓬'}</a></td>
            <td style="font-weight:bold;">${b.display_order || 0}</td>
            <td>${dateStr}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn delete" onclick="deleteBanner('${b.id}')" title="??젣"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        bannerTableBody.appendChild(tr);
    });
}

// ?곹깭 利됱떆 ?낅뜲?댄듃 ?⑥닔 (?꾩뿭)
window.updateBannerStatus = async function(id, isActiveStr) {
    const isActive = isActiveStr === 'true';
    const { error } = await db.from('banners').update({ is_active: isActive }).eq('id', id);
    if(error) alert('?곹깭 蹂寃??ㅻ쪟: ' + error.message);
};

window.deleteBanner = async function(id) {
    if(confirm('??諛곕꼫瑜??곴뎄?곸쑝濡???젣?섏떆寃좎뒿?덇퉴?')) {
        const { error } = await db.from('banners').delete().eq('id', id);
        if(error) alert('??젣 ?ㅽ뙣: ' + error.message);
        else fetchBanners();
    }
};

// ==========================================
// 6. 諛곕꼫 紐⑤떖 ?쒖뼱 諛??섏젙 濡쒖쭅
// ==========================================
function openBannerModal() {
    bannerModalTitle.textContent = '??諛곕꼫/?앹뾽 ?깅줉';
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
    saveBannerBtn.textContent = '??ν븯湲?;
    
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
    
    // ??諛곕꼫 ?깅줉 ???대?吏???꾩닔
    if(!file && !bannerImageUrl.value) {
        saveBannerMsg.textContent = '諛곕꼫 ?대?吏瑜?泥⑤??댁＜?몄슂.';
        return;
    }

    saveBannerBtn.disabled = true;
    saveBannerBtn.textContent = '???以?..';

    const payload = {
        type: bType,
        is_active: isActive,
        link_url: linkUrl || null,
        display_order: displayOrder
    };

    // ?대?吏 ?뚯씪 ?낅줈??濡쒖쭅 (bucket紐? banner-images)
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `banners/${fileName}`; // ?대뜑 吏???좏깮??        
        const { error: uploadError } = await db.storage.from('banner-images').upload(filePath, file);
        
        if (uploadError) { 
            saveBannerMsg.textContent = '?대?吏 ?낅줈???ㅻ쪟: ' + uploadError.message; 
            saveBannerBtn.disabled = false; 
            saveBannerBtn.textContent = '??ν븯湲?; 
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
        saveBannerMsg.textContent = '?깅줉 ?ㅽ뙣: ' + error.message;
        saveBannerBtn.disabled = false; 
        saveBannerBtn.textContent = '??ν븯湲?;
    } else {
        closeBannerModal();
        fetchBanners();
    }
});
// ------------------------------------------
// 7. [?좉퇋] ?곸꽭?섏씠吏 愿由?濡쒖쭅 (硫???쒗뭹 ???
// ------------------------------------------
let currentPageDataKey = ''; // 湲곕낯媛?鍮꾩썙??(targetPageId 媛믪씠 ?놁쓣 ???덉쓬)

function initPageManageTab() {
    const targetSelect = document.getElementById('targetPageId');
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

    // 1. ?쒗뭹 ?좏깮 蹂寃???濡쒕뱶
    targetSelect.addEventListener('change', (e) => {
        currentPageDataKey = 'pageData_' + e.target.value;
        loadPageData();
    });

    // 2. ??ぉ 異붽? 踰꾪듉??    if(addSpecBtn && !addSpecBtn.dataset.init) {
        addSpecBtn.addEventListener('click', () => createSpecRow('', ''));
        addSpecBtn.dataset.init = "true";
    }
    if(addFeatureBtn && !addFeatureBtn.dataset.init) {
        addFeatureBtn.addEventListener('click', () => createFeatureBlock('', ''));
        addFeatureBtn.dataset.init = "true";
    }

    // 3. ?대?吏 誘몃━蹂닿린 泥섎━
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

    // [媛쒖꽑] ?곗씠??URL??Supabase Storage???낅줈?쒗븯???ы띁 ?⑥닔
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
            throw new Error('?대?吏 ?낅줈??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ' + err.message);
        }
    }

    // 4. ???踰꾪듉
    if(savePageBtn && !savePageBtn.dataset.init) {
        savePageBtn.addEventListener('click', async () => {
            if (!targetSelect.value) {
                alert('?섏젙??????쒗뭹??癒쇱? ?좏깮?섏꽭??');
                return;
            }

            const originalBtnText = savePageBtn.innerHTML;
            savePageBtn.disabled = true;
            savePageBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ???以?..';

            try {
                // 1. ????ъ쭊??泥섎━ (?좉퇋??寃쎌슦 ?낅줈??
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

                // 2. ?곸꽭 ?대?吏??泥섎━
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
                    detailImages: detailImages, // [蹂寃? ?ㅼ쨷 ?대?吏 ???                    description: pageDescription.value,
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
                
                // [蹂寃? localStorage ???Supabase site_configs ?뚯씠釉붿뿉 ???                const { error: configError } = await db.from('site_configs').upsert({
                    key: currentPageDataKey,
                    value: data
                });
                
                if (configError) throw configError;
                
                const productName = targetSelect.options[targetSelect.selectedIndex].text;
                alert(`[${productName}] ?곸꽭?섏씠吏 ?ㅼ젙???깃났?곸쑝濡???λ릺?덉뒿?덈떎.`);
                
                // ?낅줈????誘몃━蹂닿린??src瑜???URL濡?援먯껜 (?ㅼ떆 ??ν븷 ???ъ뾽濡쒕뱶 諛⑹?)
                loadPageData(); 

            } catch (error) {
                console.error('Save Error:', error);
                alert('???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ' + error.message);
            } finally {
                savePageBtn.disabled = false;
                savePageBtn.innerHTML = originalBtnText;
            }
        });
        savePageBtn.dataset.init = "true";
    }

    // 珥덇린 ?곗씠??濡쒕뱶
    if (targetSelect.value) {
        currentPageDataKey = 'pageData_' + targetSelect.value;
        loadPageData();
    } else {
        // ?쒗뭹 紐⑸줉???꾩쭅 ?녿뒗 寃쎌슦
        currentPageDataKey = '';
    }
}

function createSpecRow(key, val) {
    const specContainer = document.getElementById('specContainer');
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.style.cssText = "display:flex; gap:10px; align-items:center;";
    row.innerHTML = `
        <input type="text" class="form-control" placeholder="??ぉ紐? value="${key}" style="flex:1;">
        <input type="text" class="form-control" placeholder="?댁슜" value="${val}" style="flex:2;">
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
            <input type="text" class="form-control" placeholder="?뱀쭠 ?쒕ぉ" value="${title}" style="font-weight:bold; width:85%;">
            <button class="action-btn delete" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="form-control" rows="2" placeholder="?뱀쭠 ?ㅻ챸???낅젰?섏꽭??>${desc}</textarea>
    `;
    featureContainer.appendChild(block);
}

async function loadPageData() {
    if(!currentPageDataKey) return;

    // [蹂寃? localStorage ???Supabase site_configs ?뚯씠釉붿뿉??濡쒕뱶
    // 1. Supabase에서 먼저 시도
    let { data: configData } = await db.from('site_configs').select('value').eq('key', currentPageDataKey).maybeSingle();
    let rawData = configData ? configData.value : null;

    // 2. 만약 없다면 localStorage에서 로컬 데이터 확인 (마이그레이션 용도)
    if (!rawData) {
        const localData = localStorage.getItem(currentPageDataKey);
        if (localData) {
            try {
                rawData = JSON.parse(localData);
                console.log("Loaded legacy data from localStorage for:", currentPageDataKey);
            } catch(e) {}
        }
    }
    const specContainer = document.getElementById('specContainer');
    const featureContainer = document.getElementById('featureContainer');
    const pageMainImagePreview = document.getElementById('pageMainImagePreview');
    const pageDetailImagePreview = document.getElementById('pageDetailImagePreview');
    const pageDescription = document.getElementById('pageDescription');

    specContainer.innerHTML = '';
    featureContainer.innerHTML = '';
    pageMainImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc; margin:auto;"></i>';
    pageDetailImagePreview.innerHTML = '<i class="fa-regular fa-image" style="font-size: 2rem; color: #ccc;"></i>';
    pageDescription.value = '';

    if(!rawData) return;
    const data = rawData;
    
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
    if(data.specs) data.specs.forEach(s => createSpecRow(s.key, s.val));
    if(data.features) data.features.forEach(f => createFeatureBlock(f.title, f.desc));
}

async function fetchUsers() {
    const tBody = document.getElementById('userTableBody');
    const { data, error } = await db.from('users').select('*').limit(10);
    if(error) { tBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#e74c3c;">?곗씠?곕쿋?댁뒪??'users' ?뚯씠釉붿쓣 癒쇱? ?앹꽦?댁＜?몄슂.</td></tr>`; }
}

// 8. [媛쒖꽑] 移댄뀒怨좊━ ?꾩떆 愿由?(?꾩껜 移댄뀒怨좊━ ???諛?UI 怨좊룄??
// ------------------------------------------
// (SITE_CATEGORIES???곷떒 ?꾩뿭?쇰줈 ?대룞??

let currentSelectedSection = ''; // ?꾩옱 ?좏깮???뚮텇瑜?ID

function initCategoryDisplayTab() {
    const majorBtns = document.querySelectorAll('.major-btn');
    const minorGrid = document.getElementById('minorCategoryGrid');
    const saveBtn = document.getElementById('saveDisplayBtn');
    const statusBox = document.getElementById('displaySectionStatus');
    const selectionName = document.getElementById('currentSelectionName');

    // 1. ?遺꾨쪟 ?대┃ ?대깽??    majorBtns.forEach(btn => {
        btn.onclick = () => {
            majorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const majorKey = btn.dataset.major;
            renderMinorCategories(majorKey);
        };
    });

    // 2. ?뚮텇瑜??뚮뜑留??⑥닔
    function renderMinorCategories(majorKey) {
        const category = SITE_CATEGORIES[majorKey];
        if (!category) return;

        minorGrid.innerHTML = category.subs.map(sub => `
            <button class="minor-btn ${currentSelectedSection === sub.id ? 'active' : ''}" 
                    onclick="selectMinorCategory('${sub.id}', '${sub.name}')">
                ${sub.name}
            </button>
        `).join('');
    }

    // 3. ?뚮텇瑜??좏깮 ?⑥닔 (?꾩뿭 window 媛앹껜???곌껐?섏뿬 onclick ???
    window.selectMinorCategory = (id, name) => {
        currentSelectedSection = id;
        
        // 踰꾪듉 ?ㅽ????낅뜲?댄듃
        document.querySelectorAll('.minor-btn').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.trim() === name);
        });

        // ?곹깭李??낅뜲?댄듃
        statusBox.style.display = 'block';
        selectionName.innerText = name;

        // 泥댄겕諛뺤뒪 ?곗씠??濡쒕뱶
        loadCategoryDisplay(id);
    };

    // 4. ???踰꾪듉
    if(saveBtn && !saveBtn.dataset.init) {
        saveBtn.onclick = async () => {
            if(!currentSelectedSection) {
                alert('癒쇱? 愿由ы븷 ?뚮텇瑜??꾩떆?붾㈃)瑜??좏깮?댁＜?몄슂.');
                return;
            }
            const checkboxes = document.querySelectorAll('.display-item-cb');
            const selectedProducts = [];
            checkboxes.forEach(cb => {
                if(cb.checked) selectedProducts.push(cb.value);
            });
            // [蹂寃? localStorage ???Supabase site_configs ?뚯씠釉붿뿉 ???            const { error: displayError } = await db.from('site_configs').upsert({
                key: 'display_' + currentSelectedSection,
                value: selectedProducts
            });

            if (displayError) {
                alert('????ㅽ뙣: ' + displayError.message);
                return;
            }
            alert(`[${selectionName.innerText}] ?붾㈃ 諛곗튂媛 ?깃났?곸쑝濡???λ릺?덉뒿?덈떎.`);
        };
        saveBtn.dataset.init = "true";
    }

    // 珥덇린 ?곹깭: 泥?踰덉㎏ ?遺꾨쪟(?꾩꽌愿由ъ떆?ㅽ뀥) ?뚮뜑留?    const activeMajor = document.querySelector('.major-btn.active');
    if(activeMajor) renderMinorCategories(activeMajor.dataset.major);
}

async function loadCategoryDisplay(sectionKey) {
    // [蹂寃? localStorage ???Supabase site_configs ?뚯씠釉붿뿉??濡쒕뱶
    // 1. 새 ID로 시도
    let { data: configData } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionKey).maybeSingle();
    
    // 2. 데이터가 없고 레거시 ID가 존재한다면 옛날 ID로 한번 더 시도
    if (!configData && LEGACY_ID_MAP[sectionKey]) {
        const legacyKey = 'display_' + LEGACY_ID_MAP[sectionKey];
        const { data: legacyConfig } = await db.from('site_configs').select('value').eq('key', legacyKey).maybeSingle();
        configData = legacyConfig;
        if(configData) console.log("Loaded legacy category display from:", legacyKey);
    }
    
    const selectedIds = configData ? configData.value : [];
    
    const checkboxes = document.querySelectorAll('.display-item-cb');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
}

// ------------------------------------------
// ?쒖뒪??珥덇린?붾뒗 ?곷떒??DOMContentLoaded 由ъ뒪?덉뿉???섑뻾?⑸땲??
