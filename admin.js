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

// Global state for categories
let globalCategories = [];
const STATIC_CATEGORIES = { // Legacy fallback for safety
    'system': { label: '도서관리시스템', icon: 'fa-server' },
    'supplies': { label: '도서관 용품', icon: 'fa-box-open' },
    'furniture': { label: '도서관 가구', icon: 'fa-chair' },
    'signage': { label: '사인물', icon: 'fa-scroll' },
    'discount': { label: '할인상품', icon: 'fa-tags' }
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

// Form Inputs
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
        if(!email || !password) {
            loginMessage.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
            return;
        }
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) {
            loginMessage.textContent = '로그인 실패: ' + error.message;
        } else {
            checkSession();
        }
    });
}

if(logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const { error } = await db.auth.signOut();
        location.reload(); 
    });
}

// ==========================================
// 2. 탭 전환 로직
// ==========================================
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        
        // UI 처리
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        tabPanes.forEach(pane => {
            if(pane.id === target) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        // 탭 로딩
        if (target === 'tab-products') fetchProducts();
        if (target === 'tab-orders') {
            if (window.orderChart) window.orderChart.destroy();
            fetchOrderStats();
        }
        if (target === 'tab-inquiries') fetchInquiries();
        if (target === 'tab-banners') fetchBanners();
        if (target === 'tab-users') fetchUsers();
        if (target === 'tab-page-manage') initPageManageTab();
        if (target === 'tab-category-display') initCategoryDisplayTab();
        if (target === 'tab-category-manage') initCategoryManageTab();
    });
});

function initDashboard() {
    const firstTab = document.querySelector('.nav-item[data-target="tab-products"]');
    if(firstTab) firstTab.click();
}

// ==========================================
// 3. 상품 정보 관리 / CRUD
// ==========================================
async function fetchProducts() {
    if(!productTableBody) return;
    productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">상품 데이터를 불러오는 중입니다...</td></tr>';
    
    const { data: products, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    globalProducts = products || [];

    if (error) {
        console.error('Error fetching products:', error);
        productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state" style="color:#e74c3c;">데이터를 가져오는데 실패했습니다: ' + error.message + '</td></tr>';
        return;
    }
    renderProducts(products);
    // Dynamic Category select loading in product modal
    await fetchCategories(); 
    updateProductSelects(products);
}
function renderProducts(products) {
    if(!productTableBody) return;
    productTableBody.innerHTML = '';
    
    if (products.length === 0) {
        productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">등록된 상품이 없습니다.</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.image_url ? `<img src="${p.image_url}" class="td-img" alt="product">` : '<div class="no-img">No Img</div>';
        const dateStr = new Date(p.updated_at || p.created_at).toLocaleDateString('ko-KR');

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td><span class="badge" style="background:#f0f2f5; color:#333; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${p.category}</span></td>
            <td>${p.price}</td>
            <td>${p.stock}</td>
            <td style="font-size:0.85rem; color:#888;">${dateStr}</td>
            <td>
                <button class="action-btn edit" onclick="window.openEditModal('${p.id}')" title="수정"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="window.deleteProduct('${p.id}')" title="삭제"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        productTableBody.appendChild(tr);
    });
}

function updateProductSelects(products) {
    const targetSelect = document.getElementById('targetPageId');
    if (targetSelect) {
        targetSelect.innerHTML = '<option value="">수정할 대상 제품 선택</option>' + 
            products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');
    }
    
    // Update category select in product modal dynamically
    const productCategory = document.getElementById('productCategory');
    if (productCategory) {
        let html = '<option value="">카테고리 선택</option>';
        html += '<option value="best_product">메인 베스트 상품</option>';
        
        const majors = globalCategories.filter(c => c.is_major).sort((a,b) => a.display_order - b.display_order);
        majors.forEach(m => {
            html += `<optgroup label="${m.name}">`;
            const subs = globalCategories.filter(c => c.parent_id === m.id).sort((a,b) => a.display_order - b.display_order);
            subs.forEach(s => {
                html += `<option value="${s.id}">${s.name}</option>`;
            });
            html += `</optgroup>`;
        });
        productCategory.innerHTML = html;
    }

    const displayCheckboxGrid = document.getElementById('productCheckboxGrid');
    if (displayCheckboxGrid) {
        displayCheckboxGrid.innerHTML = products.map(p => `
            <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;">
                <input type="checkbox" class="display-item-cb" value="${p.id}">
                <div style="font-size:0.9rem;">
                    <div style="font-weight:600; color:#333; margin-bottom:2px;">${p.name}</div>
                    <div style="color:#888; font-size:0.75rem;">${p.category}</div>
                </div>
            </label>
        `).join('');
    }
}

window.openEditModal = (id) => {
    const p = globalProducts.find(x => x.id == id);
    if (!p) return;

    productIdInput.value = p.id;
    productNameInput.value = p.name;
    productCategoryInput.value = p.category;
    productPriceInput.value = p.price;
    productStockInput.value = p.stock || 0;
    productDescInput.value = p.description || '';
    productImageUrlInput.value = p.image_url || '';
    productImagePreview.innerHTML = p.image_url ? `<img src="${p.image_url}" style="width:100%; height:100%; object-fit:contain;">` : '';
    
    modalTitle.textContent = '상품 정보 수정';
    productModal.style.display = 'flex';
};

function openAddModal() {
    productIdInput.value = '';
    productNameInput.value = '';
    productCategoryInput.value = '';
    productPriceInput.value = '전화문의';
    productStockInput.value = '999';
    productDescInput.value = '';
    productImageUrlInput.value = '';
    productImagePreview.innerHTML = '';
    modalTitle.textContent = '새 상품 등록';
    productModal.style.display = 'flex';
}

if(addProductBtn) addProductBtn.onclick = openAddModal;

window.deleteProduct = async (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        const { error } = await db.from('products').delete().eq('id', id);
        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            fetchProducts();
        }
    }
};

function closeModal() {
    if(productModal) productModal.style.display = 'none';
    saveMsg.textContent = '';
}

if(closeModalBtn) closeModalBtn.onclick = closeModal;
if(cancelModalBtn) cancelModalBtn.onclick = closeModal;
if(saveProductBtn) {
    saveProductBtn.onclick = async () => {
        const id = productIdInput.value;
        const data = {
            name: productNameInput.value,
            category: productCategoryInput.value,
            price: productPriceInput.value,
            stock: parseInt(productStockInput.value) || 0,
            description: productDescInput.value,
            image_url: productImageUrlInput.value
        };

        if(!data.name || !data.category) {
            saveMsg.textContent = '상품명과 카테고리는 필수 입력 항목입니다.';
            saveMsg.className = 'msg error';
            return;
        }

        saveProductBtn.disabled = true;
        saveProductBtn.textContent = '처리 중...';

        try {
            let result;
            if (id) {
                result = await db.from('products').update(data).eq('id', id);
            } else {
                result = await db.from('products').insert([data]);
            }

            if (result.error) {
                throw result.error;
            }

            saveMsg.textContent = '성공적으로 저장되었습니다.';
            saveMsg.className = 'msg success';
            
            setTimeout(() => {
                closeModal();
                fetchProducts();
            }, 500);

        } catch (error) {
            console.error('Save error:', error);
            saveMsg.textContent = '저장 실패: ' + error.message;
            saveMsg.className = 'msg error';
        } finally {
            saveProductBtn.disabled = false;
            saveProductBtn.textContent = '저장하기';
        }
    };
}

// 엑셀 다운로드 (SheetJS 활용)
const downloadExcelBtn = document.getElementById('downloadProductExcelBtn');
if(downloadExcelBtn) {
    downloadExcelBtn.onclick = () => {
        if(globalProducts.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(globalProducts);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
        XLSX.writeFile(workbook, `sg_limu_products_${new Date().toISOString().slice(0,10)}.xlsx`);
    };
}

// ==========================================
// 4. 주문 통계 및 고객 문의
// ==========================================
async function fetchOrderStats() {
    try {
        // 실제 운영 환경에서는 orders 테이블 등을 참조
        const { data: orders } = await db.from('orders').select('*');
        const { data: sales } = await db.from('orders').select('total_price');
        
        const count = orders ? orders.length : 0;
        const totalSales = sales ? sales.reduce((acc, curr) => acc + (curr.total_price || 0), 0) : 0;

        const todayOrdersEl = document.getElementById('todayOrders');
        if(todayOrdersEl) todayOrdersEl.textContent = count;
        
        const monthSalesEl = document.getElementById('monthSales');
        if(monthSalesEl) monthSalesEl.textContent = totalSales.toLocaleString() + '원';

        renderOrderChart();
    } catch(e) {
        console.error("Stats error:", e);
    }
}

function renderOrderChart() {
    const ctx = document.getElementById('orderChart');
    if(!ctx) return;
    
    // 이전 차트 인스턴스 파괴
    if (window.orderChart) {
        window.orderChart.destroy();
    }

    window.orderChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
            datasets: [{
                label: '월별 주문현황',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

async function fetchInquiries() {
    const tBody = document.getElementById('inquiryTableBody');
    if(!tBody) return;
    
    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터를 불러오는 중입니다...</td></tr>';
    
    const { data, error } = await db.from('inquiries').select('*').order('created_at', { ascending: false });
    
    if(error) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터 로드 실패: '+error.message+'</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">접수된 문의 내역이 없습니다.</td></tr>';
        return;
    }

    tBody.innerHTML = data.map(inq => `
        <tr>
            <td>#${inq.id}</td>
            <td>${inq.author}</td>
            <td>${inq.phone}</td>
            <td style="text-align:left;">${inq.title}</td>
            <td>${new Date(inq.created_at).toLocaleDateString()}</td>
            <td>${inq.status || '대기'}</td>
            <td>
                <button class="action-btn" onclick="window.viewInquiry('${inq.id}')">보기</button>
            </td>
        </tr>
    `).join('');
}

window.viewInquiry = (id) => {
    alert("상세 문의 내용 확인 기능은 준비 중입니다. (ID: " + id + ")");
};
// ==========================================
// 5. 배너 / 팝업 관리
// ==========================================
async function fetchBanners() {
    if(!bannerTableBody) return;
    
    bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">로딩 중...</td></tr>';
    
    const { data, error } = await db.from('banners').select('*').order('display_order', { ascending: true });
    
    if (error) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터 로드 실패: '+error.message+'</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">등록된 배너/팝업이 없습니다.</td></tr>';
        return;
    }

    bannerTableBody.innerHTML = data.map(b => {
        const typeLabel = b.type === 'slide' ? '메인슬라이드' : '팝업창';
        const imgHtml = b.image_url ? `<img src="${b.image_url}" class="td-img" style="width:120px; height:auto;">` : '<div class="no-img">이미지 없음</div>';
        const statusClass = b.is_active ? 'badge success' : 'badge secondary';
        
        return `
            <tr>
                <td>${imgHtml}</td>
                <td><span class="badge" style="background:#6c5ce7; color:#fff;">${typeLabel}</span></td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${b.link_url || '-'}
                </td>
                <td style="font-weight:bold;">${b.display_order}</td>
                <td style="font-size:0.85rem; color:#888;">${new Date(b.created_at).toLocaleDateString()}</td>
                <td>
                    <select class="form-control" onchange="window.updateBannerStatus('${b.id}', this.value)" style="width:auto; display:inline-block; padding:4px 8px;">
                        <option value="true" ${b.is_active ? 'selected' : ''}>노출</option>
                        <option value="false" ${!b.is_active ? 'selected' : ''}>숨김</option>
                    </select>
                </td>
                <td>
                    <button class="action-btn delete" onclick="window.deleteBanner('${b.id}')" title="삭제">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.updateBannerStatus = async (id, status) => {
    const isActive = status === 'true';
    try {
        const { error } = await db.from('banners').update({ is_active: isActive }).eq('id', id);
        if(error) throw error;
        // fetchBanners(); // 전체 새로고침 대신 조용히 성공
    } catch (e) {
        alert('상태 변경 실패: ' + e.message);
    }
};

window.deleteBanner = async (id) => {
    if(confirm('이 배너를 정말로 삭제하시겠습니까?')) {
        const { error } = await db.from('banners').delete().eq('id', id);
        if(error) alert('삭제 실패: ' + error.message);
        else fetchBanners();
    }
};

if(addBannerBtn) {
    addBannerBtn.onclick = () => {
        bannerIdInput.value = '';
        bannerImageUrl.value = '';
        bannerImagePreview.innerHTML = '';
        bannerLinkUrlInput.value = '';
        bannerDisplayOrderInput.value = '0';
        bannerTypeInput.value = 'slide';
        bannerIsActiveInput.value = 'true';
        saveBannerMsg.textContent = '';
        bannerModalOverlay.style.display = 'flex';
    };
}

if(closeBannerModalBtn) closeBannerModalBtn.onclick = () => bannerModalOverlay.style.display = 'none';
if(cancelBannerModalBtn) cancelBannerModalBtn.onclick = () => bannerModalOverlay.style.display = 'none';

if(saveBannerBtn) {
    saveBannerBtn.onclick = async () => {
        const file = bannerImageFile.files[0];
        const type = bannerTypeInput.value;
        const isActive = bannerIsActiveInput.value === 'true';
        const linkUrl = bannerLinkUrlInput.value;
        const displayOrder = parseInt(bannerDisplayOrderInput.value) || 0;

        if(!file && !bannerImageUrl.value) {
            saveBannerMsg.textContent = '이미지 파일을 선택하거나 URL을 입력해주세요.';
            saveBannerMsg.className = 'msg error';
            return;
        }

        saveBannerBtn.disabled = true;
        saveBannerBtn.textContent = '저장 중...';
        saveBannerMsg.textContent = '데이터 처리 중입니다...';

        try {
            let finalUrl = bannerImageUrl.value;

            // 이미지가 업로드된 경우 스토리지 처리
            if(file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,7)}.${fileExt}`;
                const filePath = `banners/${fileName}`;

                const { data: uploadData, error: uploadError } = await db.storage
                    .from('banner-images')
                    .upload(filePath, file);

                if(uploadError) throw uploadError;

                const { data: { publicUrl } } = db.storage
                    .from('banner-images')
                    .getPublicUrl(filePath);

                finalUrl = publicUrl;
            }

            const payload = {
                type,
                is_active: isActive,
                link_url: linkUrl,
                display_order: displayOrder,
                image_url: finalUrl
            };

            const { error } = await db.from('banners').insert([payload]);
            if(error) throw error;

            saveBannerMsg.textContent = '배너가 성공적으로 등록되었습니다.';
            saveBannerMsg.className = 'msg success';
            
            setTimeout(() => {
                bannerModalOverlay.style.display = 'none';
                fetchBanners();
            }, 800);

        } catch (error) {
            console.error('Banner save error:', error);
            saveBannerMsg.textContent = '저장 실패: ' + error.message;
            saveBannerMsg.className = 'msg error';
        } finally {
            saveBannerBtn.disabled = false;
            saveBannerBtn.textContent = '저장하기';
        }
    };
}
// ==========================================
// 6. 상세페이지 컨텐츠 및 카테고리 노출 관리
// ==========================================
let currentPageDataKey = '';

function initPageManageTab() {
    const targetSelect = document.getElementById('targetPageId');
    const savePageBtn = document.getElementById('savePageBtn');
    
    if(!targetSelect || targetSelect.dataset.init) return;
    
    targetSelect.onchange = (e) => {
        if(!e.target.value) return;
        currentPageDataKey = 'pageData_' + e.target.value;
        loadPageData();
    };

    document.getElementById('addSpecBtn').onclick = () => createSpecRow('', '');
    document.getElementById('addFeatureBtn').onclick = () => createFeatureBlock('', '');
    
    savePageBtn.onclick = async () => {
        if(!currentPageDataKey) return alert('대상 제품을 선택해주세요.');
        
        const data = {
            description: document.getElementById('pageDescription').value,
            specs: [],
            features: []
        };
        
        document.querySelectorAll('.spec-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if(inputs[0].value) data.specs.push({ key: inputs[0].value, val: inputs[1].value });
        });
        
        document.querySelectorAll('.feature-block').forEach(block => {
            const title = block.querySelector('input').value;
            const desc = block.querySelector('textarea').value;
            if(title) data.features.push({ title, desc });
        });

        const { error } = await db.from('site_configs').upsert({ key: currentPageDataKey, value: data });
        if(error) alert('저장 실패: ' + error.message); else alert('상세페이지 내용이 저장되었습니다.');
    };
    
    targetSelect.dataset.init = "true";
}

async function loadPageData() {
    if(!currentPageDataKey) return;
    
    // 1. Supabase에서 시도
    let { data: configData } = await db.from('site_configs').select('value').eq('key', currentPageDataKey).maybeSingle();
    let rawData = configData ? configData.value : null;

    // 2. localStorage 로컬 데이터 확인 (마이그레이션 용도)
    if (!rawData) {
        const localData = localStorage.getItem(currentPageDataKey);
        if (localData) {
            try {
                rawData = JSON.parse(localData);
                console.log("Local storage fallback data loaded for:", currentPageDataKey);
            } catch(e) {
                console.error("Local data parse error", e);
            }
        }
    }

    const specContainer = document.getElementById('specContainer');
    const featureContainer = document.getElementById('featureContainer');
    specContainer.innerHTML = '';
    featureContainer.innerHTML = '';
    document.getElementById('pageDescription').value = '';
    
    if(!rawData) return;
    
    document.getElementById('pageDescription').value = rawData.description || '';
    if(rawData.specs) rawData.specs.forEach(s => createSpecRow(s.key, s.val));
    if(rawData.features) rawData.features.forEach(f => createFeatureBlock(f.title, f.desc));
}

function createSpecRow(key, val) {
    const div = document.createElement('div');
    div.className = 'spec-row';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.innerHTML = `
        <input type="text" value="${key}" class="form-control" placeholder="항목">
        <input type="text" value="${val}" class="form-control" placeholder="내용">
        <button class="action-btn delete" onclick="this.parentElement.remove()"><i class="fa-solid fa-circle-minus"></i></button>
    `;
    document.getElementById('specContainer').appendChild(div);
}

function createFeatureBlock(title, desc) {
    const div = document.createElement('div');
    div.className = 'feature-block';
    div.style.background = '#f9f9f9';
    div.style.padding = '15px';
    div.style.borderRadius = '6px';
    div.style.border = '1px solid #eee';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <input type="text" value="${title}" class="form-control" style="width:85%; font-weight:bold;" placeholder="특징 제목">
            <button class="action-btn delete" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="form-control" rows="2" placeholder="상세 설명">${desc}</textarea>
    `;
    document.getElementById('featureContainer').appendChild(div);
}

// ==========================================
// 7. 카테고리 정보 동적 관리
// ==========================================
async function fetchCategories() {
    try {
        const { data, error } = await db.from('categories').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        globalCategories = data || [];
        updateCategoryManagementTable();
        updateCategorySelectOptions();
    } catch (e) {
        console.error("Categories fetch error:", e);
    }
}

function updateCategorySelectOptions() {
    const parentSelect = document.getElementById('catParentId');
    if(!parentSelect) return;
    
    const majors = globalCategories.filter(c => c.is_major);
    parentSelect.innerHTML = '<option value="">없음 (대분류인 경우)</option>' + 
        majors.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

function updateCategoryManagementTable() {
    const tBody = document.getElementById('categoryTableBody');
    if(!tBody) return;
    
    tBody.innerHTML = '';
    
    // Sort logic: Majors first, then their respective subs
    const majors = globalCategories.filter(c => c.is_major).sort((a,b) => a.display_order - b.display_order);
    
    majors.forEach(m => {
        // Major row
        tBody.innerHTML += `
            <tr style="background:#f8f9fa;">
                <td><span class="badge" style="background:#2980b9; color:#fff;">대분류</span></td>
                <td style="font-weight:bold;">${m.id}</td>
                <td style="font-weight:bold; color:#2980b9;">${m.name}</td>
                <td>-</td>
                <td><i class="fa-solid ${m.icon_class || 'fa-folder'}"></i></td>
                <td>${m.display_order}</td>
                <td>
                    <button class="action-btn edit" onclick="window.openCategoryEditModal('${m.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" onclick="window.deleteCategory('${m.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
        
        const subs = globalCategories.filter(c => c.parent_id === m.id).sort((a,b) => a.display_order - b.display_order);
        subs.forEach(s => {
            tBody.innerHTML += `
                <tr>
                    <td><span class="badge" style="background:#bdc3c7; color:#fff;">소분류</span></td>
                    <td style="padding-left:20px; color:#666;">└ ${s.id}</td>
                    <td style="padding-left:20px;">${s.name}</td>
                    <td>${m.name}</td>
                    <td style="font-size:0.8rem; color:#999; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${s.description || '-'}</td>
                    <td>${s.display_order}</td>
                    <td>
                        <button class="action-btn edit" onclick="window.openCategoryEditModal('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" onclick="window.deleteCategory('${s.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    });
}

function initCategoryManageTab() {
    const addBtn = document.getElementById('addCategoryBtn');
    const migrateBtn = document.getElementById('migrateCategoryBtn');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const categoryModal = document.getElementById('categoryModal');
    
    if(!addBtn || addBtn.dataset.init) return;

    // Helper: Generate safe ID from name
    const generateId = (name) => {
        if (!name) return 'cat_' + Date.now();
        return 'cat_' + name.trim().toLowerCase()
            .replace(/[^a-z0-9가-힣]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 20) + '_' + Math.floor(Math.random() * 1000);
    };

    addBtn.onclick = () => {
        document.getElementById('categoryId').value = '';
        document.getElementById('catIdCode').value = '';
        document.getElementById('catIdCode').placeholder = '비워두면 자동 생성됩니다';
        document.getElementById('catName').value = '';
        document.getElementById('catIsMajor').value = 'false';
        document.getElementById('catParentId').value = '';
        document.getElementById('catDisplayOrder').value = (globalCategories.length + 1).toString();
        document.getElementById('catIcon').value = 'fa-folder';
        document.getElementById('catDesc').value = '';
        document.getElementById('categoryModalTitle').textContent = '새 카테고리 등록';
        categoryModal.style.display = 'flex';
    };

    migrateBtn.onclick = async () => {
        if(!confirm("기존 하드코딩된 카테고리 데이터를 DB로 이전하시겠습니까? (이미 데이터가 있다면 중복될 수 있습니다.)")) return;
        
        // Internal Migration logic to avoid file protocol issues
        const INITIAL_DATA = {
            'system': { icon: 'fa-server', label: '도서관리시스템', subs: [
                { id: 'rfid_tag', name: 'RFID > 태그 (TAG)' }, { id: 'rfid_anti', name: 'RFID > 분실 방지기' }, { id: 'rfid_reader', name: 'RFID > 리더기' }, { id: 'rfid_return', name: 'RFID > 대출 반납기' },
                { id: 'em_anti', name: 'EM > 분실 방지기' }, { id: 'em_gen', name: 'EM > 감응제거재생기' }, { id: 'em_tape', name: 'EM > 감응 테이프' },
                { id: 'access_7000', name: '출입관리 > TNH-7000A' }, { id: 'access_8000', name: '출입관리 > TNH-8000A' }, { id: 'access_2203', name: '출입관리 > EZ-2203AWG' }, { id: 'access_2204', name: '출입관리 > EZ-2204AWG' }
            ]},
            'supplies': { icon: 'fa-box-open', label: '도서관 용품', subs: [
                { id: 'supplies_arrange_keeper', name: '정리 > 키퍼' }, { id: 'supplies_arrange_label_color', name: '정리 > 색띠라벨' }, { id: 'supplies_arrange_label_paper', name: '정리 > 라벨용지' }, { id: 'supplies_arrange_gloves', name: '정리 > 장갑' }, { id: 'supplies_arrange_stamp', name: '정리 > 도장' }, { id: 'supplies_arrange_bookend', name: '정리 > 북앤드' }, { id: 'supplies_arrange_etc', name: '정리 > 기타' },
                { id: 'supplies_protect_filmo', name: '보호 > 필모시리즈' }, { id: 'supplies_protect_glue', name: '보호 > 중성풀' }, { id: 'supplies_protect_tape', name: '보호 > 양면테이프' }, { id: 'supplies_protect_bookcover', name: '보호 > 북커버' },
                { id: 'supplies_lend_barcode', name: '대출 > 바코드' }, { id: 'supplies_lend_equip', name: '대출 > 카드프린터/기기' }, { id: 'supplies_lend_card', name: '대출 > 회원증카드' }, { id: 'supplies_lend_thermal', name: '대출 > 감열지' },
                { id: 'sterilizer_parts', name: '책소독기 소모품' }
            ]},
            'furniture': { icon: 'fa-chair', label: '도서관 가구', subs: [
                { id: 'koas_shelf', name: '코아스 > 서가' }, { id: 'koas_table', name: '코아스 > 테이블' }, { id: 'koas_chair', name: '코아스 > 의자' }, { id: 'koas_etc', name: '코아스 > 기타' },
                { id: 'fomus_shelf', name: '포머스 > 서가' }, { id: 'fomus_table', name: '포머스 > 테이블' }, { id: 'fomus_chair', name: '포머스 > 의자' }, { id: 'fomus_etc', name: '포머스 > 기타' },
                { id: 'fursys_shelf', name: '퍼시스 > 서가' }, { id: 'fursys_table', name: '퍼시스 > 테이블' }, { id: 'fursys_chair', name: '퍼시스 > 의자' }, { id: 'fursys_etc', name: '퍼시스 > 기타' }
            ]},
            'signage': { icon: 'fa-scroll', label: '사인물', subs: [
                { id: 'sign_class', name: '분류/대분류 표지판' }, { id: 'sign_board', name: '게시판/이용안내' }, { id: 'sign_date', name: '대출반납일력표' }, { id: 'sign_custom', name: '제작 사인물' }, { id: 'best_product', name: '메인 베스트 상품' }
            ]},
            'discount': { icon: 'fa-tags', label: '할인상품', subs: [
                { id: 'discount_items', name: '할인상품 전체' }
            ]}
        };

        let count = 0;
        for(const majorId in INITIAL_DATA) {
            const data = INITIAL_DATA[majorId];
            await db.from('categories').upsert({
                id: majorId, name: data.label, is_major: true, icon_class: data.icon, display_order: count++
            });
            for(let j=0; j<data.subs.length; j++) {
                const sub = data.subs[j];
                await db.from('categories').upsert({
                    id: sub.id, name: sub.name, parent_id: majorId, is_major: false, display_order: j
                });
            }
        }
        alert("데이터 이전이 완료되었습니다.");
        fetchCategories();
    };

    saveBtn.onclick = async () => {
        const catName = document.getElementById('catName').value.trim();
        if(!catName) return alert('카테고리 이름은 필수입니다.');

        let idCode = document.getElementById('catIdCode').value.trim();
        const isEditing = document.getElementById('categoryId').value !== '';
        
        // If new and ID is empty, generate one
        if(!isEditing && !idCode) {
            idCode = generateId(catName);
        } else if (!idCode) {
            return alert('수정 시에는 식별 ID를 삭제할 수 없습니다.');
        }

        const payload = {
            id: idCode,
            name: catName,
            is_major: document.getElementById('catIsMajor').value === 'true',
            parent_id: document.getElementById('catParentId').value || null,
            display_order: parseInt(document.getElementById('catDisplayOrder').value) || 0,
            icon_class: document.getElementById('catIcon').value,
            description: document.getElementById('catDesc').value
        };

        const { error } = await db.from('categories').upsert(payload);
        if(error) alert('저장 실패: ' + error.message);
        else {
            alert('카테고리가 저장되었습니다.');
            categoryModal.style.display = 'none';
            fetchCategories();
        }
    };

    document.getElementById('closeCategoryModalBtn').onclick = () => categoryModal.style.display = 'none';
    document.getElementById('cancelCategoryModalBtn').onclick = () => categoryModal.style.display = 'none';
    
    addBtn.dataset.init = "true";
    fetchCategories();
}

window.openCategoryEditModal = (id) => {
    const c = globalCategories.find(x => x.id === id);
    if(!c) return;
    
    document.getElementById('categoryId').value = c.id;
    document.getElementById('catIdCode').value = c.id;
    document.getElementById('catName').value = c.name;
    document.getElementById('catIsMajor').value = c.is_major.toString();
    document.getElementById('catParentId').value = c.parent_id || '';
    document.getElementById('catDisplayOrder').value = c.display_order;
    document.getElementById('catIcon').value = c.icon_class || '';
    document.getElementById('catDesc').value = c.description || '';
    
    document.getElementById('categoryModalTitle').textContent = '카테고리 정보 수정';
    document.getElementById('categoryModal').style.display = 'flex';
};

window.deleteCategory = async (id) => {
    if(!confirm('해당 카테고리를 삭제하시겠습니까? (하위 분류가 있는 경우 함께 삭제되거나 오류가 발생할 수 있습니다.)')) return;
    const { error } = await db.from('categories').delete().eq('id', id);
    if(error) alert('삭제 실패: ' + error.message);
    else fetchCategories();
};
    document.getElementById('saveDisplayBtn').onclick = async () => {
        if(!currentSelectedSection) return alert('화면을 선택해주세요.');
        const selected = Array.from(document.querySelectorAll('.display-item-cb'))
            .filter(cb => cb.checked).map(cb => cb.value);
            
        const { error } = await db.from('site_configs').upsert({
            key: 'display_' + currentSelectedSection,
            value: selected
        });
        if(error) alert('저장 실패'); else alert('노출 설정이 저장되었습니다.');
    };
}

let currentSelectedSection = '';
function initCategoryDisplayTab() {
    const container = document.querySelector('.major-category-nav');
    if(!container) return;

    // Render Major category buttons dynamically
    const majors = globalCategories.filter(c => c.is_major).sort((a,b) => a.display_order - b.display_order);
    container.innerHTML = majors.map(m => `
        <button class="major-btn" data-major="${m.id}">
            <i class="fa-solid ${m.icon_class || 'fa-folder'}"></i>
            ${m.name}
        </button>
    `).join('');

    const majorBtns = container.querySelectorAll('.major-btn');
    majorBtns.forEach(btn => {
        btn.onclick = () => {
            majorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMinorCategories(btn.dataset.major);
        };
    });
}

function renderMinorCategories(majorId) {
    const grid = document.getElementById('minorCategoryGrid');
    if(!grid) return;
    
    const subs = globalCategories.filter(c => c.parent_id === majorId).sort((a,b) => a.display_order - b.display_order);
    
    grid.innerHTML = subs.map(s => `
        <button class="minor-btn ${currentSelectedSection === s.id ? 'active' : ''}" 
                onclick="window.selectMinorCategory('${s.id}', '${s.name}')">
            ${s.name}
        </button>
    `).join('');
}

window.selectMinorCategory = (id, name) => {
    currentSelectedSection = id;
    document.querySelectorAll('.minor-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.trim() === name));
    document.getElementById('displaySectionStatus').style.display = 'block';
    document.getElementById('currentSelectionName').textContent = name;
    loadCategoryDisplay(id);
};

async function loadCategoryDisplay(sectionKey) {
    let { data: configData } = await db.from('site_configs').select('value').eq('key', 'display_' + sectionKey).maybeSingle();
    
    // 신규 ID로 데이터가 없는 경우, 이전 ID 맵을 통해 레거시 데이터 확인
    if (!configData && LEGACY_ID_MAP[sectionKey]) {
        let { data: legacyData } = await db.from('site_configs').select('value').eq('key', 'display_' + LEGACY_ID_MAP[sectionKey]).maybeSingle();
        configData = legacyData;
    }
    
    const selectedIds = configData ? configData.value : [];
    document.querySelectorAll('.display-item-cb').forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
}
// ==========================================
// 7. 회원 관리 / 기타
// ==========================================
async function fetchUsers() {
    const tBody = document.getElementById('userTableBody');
    if(!tBody) return;
    
    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">로딩 중...</td></tr>';
    
    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false }).limit(50);
    
    if (error) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">로드 실패: '+error.message+'</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">가입된 회원이 없습니다.</td></tr>';
        return;
    }

    tBody.innerHTML = data.map(u => `
        <tr>
            <td>${u.id.substring(0,8)}</td>
            <td>${u.organization || '-'}</td>
            <td>${u.username || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.is_approved ? '<span class="badge success">승인</span>' : '<span class="badge warning">대기</span>'}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn edit" onclick="window.manageUser('${u.id}')" title="계정 관리">
                    <i class="fa-solid fa-user-gear"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.manageUser = (id) => {
    alert("회원 권한 관리 기능은 준비 중입니다. (ID: " + id + ")");
};
