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
    
    let { data: configData } = await db.from('site_configs').select('value').eq('key', currentPageDataKey).maybeSingle();
    let rawData = configData ? configData.value : null;

    if (!rawData) {
        const localData = localStorage.getItem(currentPageDataKey);
        if (localData) { try { rawData = JSON.parse(localData); } catch(e){} }
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

let currentSelectedSection = '';
function initCategoryDisplayTab() {
    const majorBtns = document.querySelectorAll('.major-btn');
    majorBtns.forEach(btn => {
        btn.onclick = () => {
            majorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMinorCategories(btn.dataset.major);
        };
    });
    
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

function renderMinorCategories(majorKey) {
    const cat = SITE_CATEGORIES[majorKey];
    const grid = document.getElementById('minorCategoryGrid');
    grid.innerHTML = cat.subs.map(s => `
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
    if (!configData && LEGACY_ID_MAP[sectionKey]) {
        let { data: legacyData } = await db.from('site_configs').select('value').eq('key', 'display_' + LEGACY_ID_MAP[sectionKey]).maybeSingle();
        configData = legacyData;
    }
    const selectedIds = configData ? configData.value : [];
    document.querySelectorAll('.display-item-cb').forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
}

async function fetchUsers() {
    const tBody = document.getElementById('userTableBody');
    if(!tBody) return;
    const { data: users, error } = await db.from('users').select('*').limit(50);
    if(error || !users) return;
    tBody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id.substring(0,8)}</td>
            <td>${u.organization || '-'}</td>
            <td>${u.username || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.is_approved ? '승인' : '대기'}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td><button class="action-btn edit"><i class="fa-solid fa-user-gear"></i></button></td>
        </tr>
    `).join('');
}
