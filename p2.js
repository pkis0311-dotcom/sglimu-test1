function initDashboard() {
    const firstTab = document.querySelector('.nav-item[data-target="tab-products"]');
    if(firstTab) firstTab.click();
}

// ==========================================
// 3. 상품 정보 관리 / CRUD
// ==========================================
async function fetchProducts() {
    if(!productTableBody) return;
    productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">로딩 중...</td></tr>';
    
    const { data: products, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    globalProducts = products || [];

    if (error) {
        console.error('Error fetching products:', error);
        productTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터 로드 실패</td></tr>';
        return;
    }
    renderProducts(products);
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
                <button class="action-btn edit" onclick="window.openEditModal('${p.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="window.deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
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
    const displayCheckboxGrid = document.getElementById('productCheckboxGrid');
    if (displayCheckboxGrid) {
        displayCheckboxGrid.innerHTML = products.map(p => `
            <label style="display:flex; align-items:center; gap:8px; padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;">
                <input type="checkbox" class="display-item-cb" value="${p.id}">
                <div style="font-size:0.9rem;">[${p.category}]<br>${p.name}</div>
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
        if (error) alert('삭제 실패: ' + error.message);
        else fetchProducts();
    }
};

function closeModal() { if(productModal) productModal.style.display = 'none'; }
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

        if(!data.name) return alert('상품명을 입력해주세요.');

        saveProductBtn.disabled = true;
        saveProductBtn.textContent = '저장 중...';

        let result;
        if (id) {
            result = await db.from('products').update(data).eq('id', id);
        } else {
            result = await db.from('products').insert([data]);
        }

        if (result.error) {
            alert('저장 실패: ' + result.error.message);
        } else {
            productModal.style.display = 'none';
            fetchProducts();
        }
        saveProductBtn.disabled = false;
        saveProductBtn.textContent = '저장하기';
    };
}
