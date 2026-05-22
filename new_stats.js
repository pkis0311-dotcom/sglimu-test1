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
