// ==========================================
// 4. 주문 통계 및 고객 문의
// ==========================================
async function fetchOrderStats() {
    try {
        const { data: orders } = await db.from('orders').select('*');
        if(orders) {
            const todayCountEl = document.getElementById('todayOrders');
            if(todayCountEl) todayCountEl.textContent = orders.length;
        }
        renderOrderChart();
    } catch(e) { console.error(e); }
}

function renderOrderChart() {
    const ctx = document.getElementById('orderChart');
    if(!ctx) return;
    window.orderChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1월','2월','3월','4월','5월','6월'],
            datasets: [{ label: '주문 건수', data: [12, 19, 3, 5, 2, 3], borderColor: '#3498db', fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function fetchInquiries() {
    const tBody = document.getElementById('inquiryTableBody');
    if(!tBody) return;
    tBody.innerHTML = '<tr><td colspan="7" class="empty-state">로딩 중...</td></tr>';
    const { data: inquiries, error } = await db.from('inquiries').select('*').order('created_at', { ascending: false });
    if(error || !inquiries) {
        tBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터 로드 실패</td></tr>';
        return;
    }
    tBody.innerHTML = inquiries.map(inq => `
        <tr>
            <td>#${inq.id}</td>
            <td>${inq.author}</td>
            <td>${inq.phone}</td>
            <td style="text-align:left;">${inq.title}</td>
            <td>${new Date(inq.created_at).toLocaleDateString()}</td>
            <td>${inq.status}</td>
            <td><button class="action-btn" onclick="alert('${inq.title}')">보기</button></td>
        </tr>
    `).join('');
}

// ==========================================
// 5. 배너 / 팝업 관리
// ==========================================
async function fetchBanners() {
    if(!bannerTableBody) return;
    bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">로딩 중...</td></tr>';
    
    const { data: banners, error } = await db.from('banners').select('*').order('display_order', { ascending: true });
    if(error) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">데이터 로드 실패</td></tr>';
        return;
    }

    bannerTableBody.innerHTML = '';
    if(banners.length === 0) {
        bannerTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">등록된 배너가 없습니다.</td></tr>';
        return;
    }

    banners.forEach(b => {
        const tr = document.createElement('tr');
        const imgHtml = b.image_url ? `<img src="${b.image_url}" class="td-img" style="width:120px; height:auto;">` : '-';
        const typeLabel = b.type === 'slide' ? '메인슬라이드' : '팝업창';
        
        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td><span class="badge" style="background:#6c5ce7; color:#fff;">${typeLabel}</span></td>
            <td>${b.link_url || '-'}</td>
            <td>${b.display_order}</td>
            <td>${new Date(b.created_at).toLocaleDateString()}</td>
            <td>
                <select onchange="window.updateBannerStatus('${b.id}', this.value)">
                    <option value="true" ${b.is_active ? 'selected' : ''}>노출</option>
                    <option value="false" ${!b.is_active ? 'selected' : ''}>숨김</option>
                </select>
            </td>
            <td><button class="action-btn delete" onclick="window.deleteBanner('${b.id}')"><i class="fa-solid fa-trash"></i></button></td>
        `;
        bannerTableBody.appendChild(tr);
    });
}

window.updateBannerStatus = async (id, status) => {
    const isActive = status === 'true';
    const { error } = await db.from('banners').update({ is_active: isActive }).eq('id', id);
    if(error) alert('상태 변경 실패');
};

window.deleteBanner = async (id) => {
    if(confirm('배너를 삭제하시겠습니까?')) {
        const { error } = await db.from('banners').delete().eq('id', id);
        if(error) alert('삭제 실패'); else fetchBanners();
    }
};

if(addBannerBtn) {
    addBannerBtn.onclick = () => {
        bannerIdInput.value = '';
        bannerImageUrl.value = '';
        bannerImagePreview.innerHTML = '';
        bannerLinkUrlInput.value = '';
        bannerDisplayOrderInput.value = '0';
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

        if(!file && !bannerImageUrl.value) return alert('이미지를 선택해주세요.');

        saveBannerBtn.disabled = true;
        saveBannerBtn.textContent = '저장 중...';

        let finalUrl = bannerImageUrl.value;
        if(file) {
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await db.storage.from('banner-images').upload(fileName, file);
            if(uploadError) { 
                alert('이미지 업로드 실패: ' + uploadError.message); 
                saveBannerBtn.disabled = false;
                saveBannerBtn.textContent = '저장하기';
                return; 
            }
            const { data: { publicUrl } } = db.storage.from('banner-images').getPublicUrl(fileName);
            finalUrl = publicUrl;
        }

        const payload = { type, is_active: isActive, link_url: linkUrl, display_order: displayOrder, image_url: finalUrl };
        const { error } = await db.from('banners').insert([payload]);
        
        if(error) alert('저장 실패: ' + error.message);
        else { bannerModalOverlay.style.display = 'none'; fetchBanners(); }
        
        saveBannerBtn.disabled = false;
        saveBannerBtn.textContent = '저장하기';
    };
}
