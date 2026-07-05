// cart.js - 장바구니 로직 처리

// 나이스페이 결제창 SDK 스크립트 즉시 로드 (onload 시점 이전에 정의하기 위함)
(function() {
    if (window.goPay) return;
    const script = document.createElement('script');
    script.src = 'https://web.nicepay.co.kr/v3/webstd/js/nicepay-3.0.js';
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    document.head.appendChild(script);
})();

// NICEPAY 연동에 필요한 헬퍼 함수들
function getEdiDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// 전역 장바구니 팝업 HTML 템플릿 주입
document.addEventListener('DOMContentLoaded', () => {
    // 1. 장바구니 UI 주입
    const cartHTML = `
        <div id="cartOverlay" class="slide-cart-overlay">
            <div class="slide-cart" id="slideCart">
                <div class="cart-header">
                    <h2><i class="fa-solid fa-cart-shopping"></i> 장바구니</h2>
                    <button class="close-cart" id="closeCartBtn">&times;</button>
                </div>
                <div class="cart-items" id="cartItemList">
                    <!-- 상품 목록 렌더링 영역 -->
                </div>
                <div class="cart-footer">
                    <div class="cart-total">
                        <span>총 결제금액</span>
                        <span id="cartTotalPrice">0원</span>
                    </div>
                    <button class="btn-checkout" id="btnCartCheckout">장바구니 결제하기</button>
                    <button class="btn-quote" id="btnCartQuote">견적서 자동 발행 (PDF)</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', cartHTML);

    // 1-2. 주문 정보 입력 모달 주입 (이메일 필드 추가)
    const checkoutHTML = `
        <div id="checkoutOverlay" class="auth-overlay" style="display:none; align-items:center; justify-content:center;">
            <div class="auth-modal" style="max-width:500px;">
                <div class="auth-close" id="closeCheckoutBtn">&times;</div>
                <div class="auth-content" style="max-height:85vh; overflow-y:auto;">
                    <div class="auth-header">
                        <h2><i class="fa-solid fa-credit-card"></i> 주문서 작성</h2>
                        <p>배송 정보를 입력해 주세요.</p>
                    </div>
                    <form id="checkoutForm">
                        <div class="auth-form-group">
                            <label>주문자 이름 *</label>
                            <input type="text" id="checkoutName" class="auth-input" placeholder="홍길동" required>
                        </div>
                        <div class="auth-form-group">
                            <label>연락처 *</label>
                            <input type="tel" id="checkoutPhone" class="auth-input" placeholder="010-0000-0000" required>
                        </div>
                        <div class="auth-form-group">
                            <label>이메일 주소 *</label>
                            <input type="email" id="checkoutEmail" class="auth-input" placeholder="example@email.com" required>
                        </div>
                        <div class="auth-form-group">
                            <label>소속 기관 / 학교명</label>
                            <input type="text" id="checkoutOrg" class="auth-input" placeholder="예: 시립도서관">
                        </div>
                        <div class="auth-form-group">
                            <label>배송지 주소 *</label>
                            <input type="text" id="checkoutAddress" class="auth-input" placeholder="전체 주소를 입력하세요" required>
                        </div>
                        <div class="total-price-box" style="margin-top:20px; padding-top:15px; border-top:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; font-size:1.1rem;">최종 결제 금액</span>
                            <span id="checkoutTotalPrice" style="font-weight:800; font-size:1.5rem; color:var(--color-primary);">0원</span>
                        </div>
                        <button type="submit" class="auth-submit-btn" id="btnSubmitCheckout">결제 및 주문 완료하기</button>
                    </form>
                    <div id="checkoutMsg" class="auth-message"></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', checkoutHTML);

    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const btnCartCheckout = document.getElementById('btnCartCheckout');
    const checkoutOverlay = document.getElementById('checkoutOverlay');
    const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
    const checkoutForm = document.getElementById('checkoutForm');
    const checkoutMsg = document.getElementById('checkoutMsg');

    // 결제 모달 열기 이벤트
    if (btnCartCheckout) {
        btnCartCheckout.addEventListener('click', async (e) => {
            e.preventDefault();
            const cart = getCart();
            if (cart.length === 0) {
                alert('장바구니가 비어 있습니다.');
                return;
            }
            closeCart();
            
            // 토탈 가격 표시
            let total = 0;
            cart.forEach(item => total += item.price * item.qty);
            document.getElementById('checkoutTotalPrice').innerText = total.toLocaleString() + '원';
            
            // 모달 초기화
            if (checkoutMsg) {
                checkoutMsg.className = 'auth-message';
                checkoutMsg.style.display = 'none';
                checkoutMsg.textContent = '';
            }

            // 모달 열기
            checkoutOverlay.style.display = 'flex';

            // 로그인 사용자 정보 자동 조회
            if (window.supabase) {
                try {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await window.supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', user.id)
                            .single();
                        
                        if (profile) {
                            if (document.getElementById('checkoutName')) document.getElementById('checkoutName').value = profile.full_name || '';
                            if (document.getElementById('checkoutPhone')) document.getElementById('checkoutPhone').value = profile.phone || '';
                            if (document.getElementById('checkoutEmail')) document.getElementById('checkoutEmail').value = user.email || '';
                            if (document.getElementById('checkoutOrg')) document.getElementById('checkoutOrg').value = profile.organization || '';
                            if (document.getElementById('checkoutAddress')) document.getElementById('checkoutAddress').value = profile.address || '';
                        }
                    }
                } catch (err) {
                    console.error('Failed to pre-fill user info:', err);
                }
            }
        });
    }

    // 결제 모달 닫기
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', () => {
            checkoutOverlay.style.display = 'none';
        });
    }
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener('click', (e) => {
            if (e.target === checkoutOverlay) {
                checkoutOverlay.style.display = 'none';
            }
        });
    }

    // 주문서 제출 이벤트 (NICEPAY 결제창 연동)
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('btnSubmitCheckout');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = '결제 요청 중...';
            submitBtn.disabled = true;

            if (checkoutMsg) {
                checkoutMsg.className = 'auth-message';
                checkoutMsg.style.display = 'none';
            }

            try {
                const name = document.getElementById('checkoutName').value.trim();
                const phone = document.getElementById('checkoutPhone').value.trim();
                const email = document.getElementById('checkoutEmail').value.trim();
                const org = document.getElementById('checkoutOrg').value.trim();
                const address = document.getElementById('checkoutAddress').value.trim();
                
                const cart = getCart();
                if (cart.length === 0) {
                    throw new Error('장바구니가 비어 있습니다.');
                }

                // 상품명 문자열 포맷팅
                let orderProductName = cart[0].name;
                if (cart.length > 1) {
                    orderProductName += ` 외 ${cart.length - 1}건`;
                }

                // 총 수량 및 금액 계산
                let totalQuantity = 0;
                let totalPrice = 0;
                cart.forEach(item => {
                    totalQuantity += item.qty;
                    totalPrice += item.price * item.qty;
                });

                if (!window.supabase) {
                    throw new Error('Supabase client가 초기화되지 않았습니다.');
                }

                // 1. NICEPAY SDK 로드 여부 검증
                if (!window.goPay) {
                    throw new Error('나이스페이 결제 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.');
                }

                // 2. Supabase orders 테이블에 주문 추가 (상태: pending)
                const { data: orderData, error: orderError } = await window.supabase.from('orders').insert([
                    {
                        customer_name: name,
                        customer_phone: phone,
                        product_name: orderProductName,
                        quantity: totalQuantity,
                        total_price: totalPrice,
                        status: 'pending' // 결제대기
                    }
                ]).select();

                if (orderError) throw orderError;
                if (!orderData || orderData.length === 0) {
                    throw new Error('주문 생성에 실패했습니다.');
                }

                const orderId = orderData[0].id; // 생성된 주문 ID (Moid로 사용)

                // 로그인 회원인 경우 프로필의 주소/연락처 자가 치유(자동 저장)
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    await window.supabase.from('profiles').update({
                        phone: phone,
                        organization: org,
                        address: address
                    }).eq('id', user.id);
                }

                // 3. NICEPAY 서명 데이터 생성 (SHA-256)
                const NICEPAY_MID = 'SG1142086m';
                const NICEPAY_KEY = 'AaJF/v+0i2QFScNpEl2pNs/5VqTk6rRyh2iwP1RlQ7Oxhta5jNNAitKJpY0Q15Lcm4p8jOD0UZ40ob9XgkJyoA==';
                
                // Return URL: 결제 결과를 수신할 Supabase Edge Function 주소
                const NICEPAY_RETURN_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co/functions/v1/nicepay-callback';

                const ediDate = getEdiDate();
                
                // SignData = SHA256(EdiDate + MID + Amt + MerchantKey)
                const signSource = ediDate + NICEPAY_MID + totalPrice + NICEPAY_KEY;
                const signData = await sha256(signSource);

                // 4. NICEPAY 결제를 위한 히든 폼 생성 및 전송
                // 기존 결제 폼 제거
                const existingForm = document.querySelector('form[name="payForm"]');
                if (existingForm) {
                    existingForm.remove();
                }

                const form = document.createElement('form');
                form.name = 'payForm';
                form.method = 'POST';
                form.action = NICEPAY_RETURN_URL; // NICEPAY가 최종 결제 완료 후 POST 결과를 전송할 주소

                // 필드값 정의
                const fields = {
                    PayMethod: 'CARD', // 기본 결제 수단: 신용카드
                    GoodsName: orderProductName,
                    Amt: totalPrice,
                    MID: NICEPAY_MID,
                    Moid: orderId,
                    BuyerName: name,
                    BuyerTel: phone,
                    BuyerEmail: email,
                    EdiDate: ediDate,
                    SignData: signData,
                    CharSet: 'utf-8',
                    GoodsCl: '1', // 1: 실물, 0: 컨텐츠
                    TransType: '0', // 0: 일반, 1: 에스크로
                    NP_Keytype: '2' // 2: SHA256
                };

                for (const [key, value] of Object.entries(fields)) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                }

                document.body.appendChild(form);

                // 결제 완료 시 로컬 카트를 지우기 위한 임시 세션 마킹 (NICEPAY는 Iframe으로 결제되므로 완료 후 페이지 전환 전 카트 정리용)
                localStorage.setItem('sg_limu_pending_order', orderId);

                // 5. NICEPAY 결제창 시작
                goPay(form);
                
                // 버튼 상태 복구
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;

            } catch (err) {
                console.error('Order checkout error:', err);
                if (checkoutMsg) {
                    checkoutMsg.textContent = '결제 요청 실패: ' + (err.message || '알 수 없는 오류');
                    checkoutMsg.classList.add('error');
                    checkoutMsg.style.display = 'block';
                }
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // 2. 상단 메뉴 바 장바구니 아이콘 찾아서 뱃지 달기 및 클릭이벤트 연동
    const topCartIcons = document.querySelectorAll('.header-utils .fa-cart-shopping');
    topCartIcons.forEach(icon => {
        const parentLink = icon.closest('a');
        if(parentLink) {
            parentLink.style.position = 'relative';
            parentLink.insertAdjacentHTML('beforeend', '<span class="cart-badge" id="topCartBadge">0</span>');
            
            parentLink.addEventListener('click', (e) => {
                e.preventDefault();
                openCart();
            });
        }
    });

    // 사이드바 장바구니 버튼 연동
    const asideCartBtns = document.querySelectorAll('.cart-btn-aside');
    asideCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 다른 팝업(관심상품, 최근본상품 등) 닫기
            const wishlistWindow = document.getElementById('wishlistWindow');
            if (wishlistWindow) wishlistWindow.classList.remove('active');
            const recentWindow = document.getElementById('recentWindow');
            if (recentWindow) recentWindow.classList.remove('active');
            
            openCart();
        });
    });

    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', (e) => {
        if(e.target === cartOverlay) closeCart();
    });

    // 견적서 발행 버튼 연동
    const btnCartQuote = document.getElementById('btnCartQuote');
    if(btnCartQuote) {
        btnCartQuote.addEventListener('click', generateQuotePDF);
    }

    // 화면의 모든 장바구니 담기(.btn-cart) 버튼 연동
    const addCartBtns = document.querySelectorAll('.btn-cart');
    addCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // 상품 상세 페이지일 경우 정보 자동수집
            const TitleEl = document.querySelector('.product-title');
            const PriceEl = document.querySelector('.product-price');
            
            let pName = TitleEl ? TitleEl.innerText.trim() : document.title;
            if (!TitleEl && pName.includes(' - 에스지라이뮤')) {
                pName = pName.replace(' - 에스지라이뮤', '');
            }
            
            // 기본 가격 가져오기 (상세페이지면 window.basePrice를 우선 사용)
            let pPrice = window.basePrice;
            if (pPrice === undefined || pPrice === null) {
                const pPriceRaw = PriceEl ? PriceEl.innerText.replace(/[^0-9]/g, '') : "0";
                pPrice = parseInt(pPriceRaw) || 0;
            }
            
            // 상세페이지의 색상/사이즈 옵션 수집
            const colorSelect = document.getElementById('colorOption');
            const sizeSelect = document.getElementById('sizeOption');
            const qtyInput = document.getElementById('qtyInput');
            
            let selectedOptions = [];
            let optPrice = 0;
            let optionKeyParts = [];
            
            if (colorSelect && colorSelect.value && colorSelect.value !== '0|') {
                const val = colorSelect.value;
                const parts = val.split('|');
                if (parts.length === 2 && parts[1]) {
                    optPrice += parseInt(parts[0]) || 0;
                    selectedOptions.push(`색상: ${parts[1]}`);
                    optionKeyParts.push(parts[1]);
                }
            }
            if (sizeSelect && sizeSelect.value && sizeSelect.value !== '0|') {
                const val = sizeSelect.value;
                const parts = val.split('|');
                if (parts.length === 2 && parts[1]) {
                    optPrice += parseInt(parts[0]) || 0;
                    selectedOptions.push(`사이즈: ${parts[1]}`);
                    optionKeyParts.push(parts[1]);
                }
            }
            
            const finalUnitPrice = pPrice + optPrice;
            const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
            
            // 장바구니에 담을 때 옵션 정보를 이름에 병기
            let displayName = pName;
            if (selectedOptions.length > 0) {
                displayName += ` (${selectedOptions.join(', ')})`;
            }
            
            const item = {
                // 중복 방지를 위한 ID 생성 (옵션 조합별로 다른 장바구니 아이템으로 처리)
                id: pName + '_' + optionKeyParts.join('_') + '_' + finalUnitPrice + '_' + new Date().getTime(),
                name: displayName,
                price: finalUnitPrice,
                qty: qty
            };
            
            addToCart(item);
            openCart();
        });
    });

    // 처음 접속시 랜더링
    renderCart();
});

// 핵심 로직 함수들
function getCart() {
    return JSON.parse(localStorage.getItem('sg_limu_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('sg_limu_cart', JSON.stringify(cart));
}

function addToCart(newItem) {
    let cart = getCart();
    // 중복 상품이 있다면 수량 합산
    let existingItem = cart.find(item => item.name === newItem.name && item.price === newItem.price);
    
    if(existingItem) {
        existingItem.qty += (newItem.qty || 1);
    } else {
        cart.push(newItem);
    }
    
    saveCart(cart);
    renderCart(); // 추가 후 재렌더링
}

window.removeFromCart = function(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    renderCart();
};

function renderCart() {
    let cart = getCart();
    const cartItemList = document.getElementById('cartItemList');
    const badge = document.getElementById('topCartBadge');
    
    if(!cartItemList) return;

    if(cart.length === 0) {
        cartItemList.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px;"></i><p>장바구니가 비어 있습니다.</p></div>`;
        document.getElementById('cartTotalPrice').innerText = '0원';
        if(badge) badge.style.display = 'none';
        return;
    }

    // 뱃지 업데이트
    if(badge) {
        badge.innerText = cart.length;
        badge.style.display = 'inline-block';
    }

    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.price.toLocaleString()}원 x ${item.qty}개</p>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;
    });

    cartItemList.innerHTML = html;
    document.getElementById('cartTotalPrice').innerText = total.toLocaleString() + '원';
}

function openCart() {
    document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
}

// ==========================================
// 견적서 PDF 자동 발행 기능
// ==========================================
async function generateQuotePDF() {
    const cart = getCart();
    if(cart.length === 0) {
        alert('장바구니에 상품을 담아주세요.');
        return;
    }

    const btn = document.getElementById('btnCartQuote');
    const originalText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...';
    btn.disabled = true;

    try {
        // 1. 사용자 정보 가져오기 (Supabase 연동 시도)
        let purchaserInfo = { name: "귀하", org: "기관/개인", phone: "-" };
        
        // auth.js의 supabase 클라이언트를 전역에서 접근 가능한지 확인 (또는 직접 초기화)
        if (window.supabase) {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    purchaserInfo = {
                        name: profile.full_name || user.email.split('@')[0],
                        org: profile.organization || "개인",
                        phone: profile.phone || "-"
                    };
                }
            }
        }

        // 2. 날짜 계산
        const today = new Date();
        const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
        const validDate = new Date();
        validDate.setDate(today.getDate() + 30);
        const validStr = `${validDate.getFullYear()}년 ${validDate.getMonth() + 1}월 ${validDate.getDate()}일까지 (30일)`;

        // 3. 견적서 번호 
        const quoteNo = 'QL-' + today.getTime().toString().slice(-8);

        // 4. 제품 리스트 HTML 생성
        let total = 0;
        const itemRows = cart.map((item, idx) => {
            const sum = item.price * item.qty;
            total += sum;
            return `
                <tr>
                    <td style="text-align:center;">${idx + 1}</td>
                    <td style="padding:10px;">${item.name}</td>
                    <td style="text-align:center;">규격참조</td>
                    <td style="text-align:center; padding:10px;">${item.qty.toLocaleString()}</td>
                    <td style="text-align:right; padding:10px;">${item.price.toLocaleString()}</td>
                    <td style="text-align:right; padding:10px;">${sum.toLocaleString()}</td>
                    <td style="text-align:center;">-</td>
                </tr>
            `;
        }).join('');

        // 5. PDF 템플릿 생성
        const element = document.createElement('div');
        element.style.padding = '40px';
        element.style.fontFamily = "'Pretendard', sans-serif";
        element.style.color = '#333';
        element.style.background = '#fff';
        element.style.fontSize = '12px';

        element.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="font-size:32px; font-weight:800; border-bottom:4px double #000; display:inline-block; padding:0 30px 5px; margin-bottom:10px;">견 &nbsp; 적 &nbsp; 서</h1>
            </div>

            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <div style="flex:1; padding-right:20px;">
                    <p style="margin-bottom:8px;">문서번호 : ${quoteNo}</p>
                    <p style="margin-bottom:8px;">발행일자 : ${dateStr}</p>
                    <div style="border:2px solid #000; padding:15px; margin-top:10px; min-height:80px;">
                        <h2 style="font-size:18px; margin-bottom:10px;">${purchaserInfo.org} &nbsp; ${purchaserInfo.name} 貴下</h2>
                        <p style="font-size:13px; line-height:1.5;">아래와 같이 견적합니다.</p>
                        <p style="font-size:13px; font-weight:700; margin-top:10px; border-bottom:1px solid #333; display:inline-block;">합계금액 : ￦ ${total.toLocaleString()} (VAT포함)</p>
                    </div>
                </div>

                <div style="flex:1; display:flex;">
                    <table style="width:100%; border-collapse:collapse; border:2px solid #000; font-size:11px;">
                        <tr>
                            <td rowspan="5" style="width:25px; border-right:1px solid #000; text-align:center; background:#f9f9f9; font-weight:700;">공<br><br>급<br><br>자</td>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000; text-align:center; background:#f9f9f9;">사업자번호</td>
                            <td colspan="3" style="padding:5px; border-bottom:1px solid #000;">621-81-42086</td>
                        </tr>
                        <tr>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000; text-align:center; background:#f9f9f9;">상 호</td>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000;">(주)에스지라이뮤</td>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000; text-align:center; background:#f9f9f9;">성 명</td>
                            <td style="padding:5px; border-bottom:1px solid #000; position:relative;">
                                강인숙
                                <div style="position:absolute; right:5px; top:-5px;">
                                    <svg width="45" height="45" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="red" stroke-width="3" opacity="0.8"/>
                                        <text x="50" y="45" text-anchor="middle" fill="red" font-size="16" font-weight="bold" opacity="0.8">에스지</text>
                                        <text x="50" y="65" text-anchor="middle" fill="red" font-size="16" font-weight="bold" opacity="0.8">라이뮤</text>
                                        <rect x="15" y="15" width="70" height="70" fill="none" stroke="red" stroke-width="2" transform="rotate(45 50 50)" opacity="0.3"/>
                                    </svg>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000; text-align:center; background:#f9f9f9;">주 소</td>
                            <td colspan="3" style="padding:5px; border-bottom:1px solid #000;">부산광역시 금정구 놀이마당로 29-1 (청룡동)</td>
                        </tr>
                        <tr>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000; text-align:center; background:#f9f9f9;">업 태</td>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000;">도소매, 제조, 서비스</td>
                            <td style="padding:5px; border-bottom:1px solid #000; border-right:1px solid #000; text-align:center; background:#f9f9f9;">종 목</td>
                            <td style="padding:5px; border-bottom:1px solid #000;">도서관용품, 가구</td>
                        </tr>
                        <tr>
                            <td style="padding:5px; border-right:1px solid #000; text-align:center; background:#f9f9f9;">전화번호</td>
                            <td colspan="3" style="padding:5px;">Tel: 1544-5703 / Fax: 051-518-5985</td>
                        </tr>
                    </table>
                </div>
            </div>

            <table style="width:100%; border-collapse:collapse; border:2px solid #000; margin-bottom:20px;">
                <thead>
                    <tr style="background:#f2f2f2; font-weight:700;">
                        <td style="border:1px solid #000; padding:10px; text-align:center; width:30px;">NO</td>
                        <td style="border:1px solid #000; padding:10px; text-align:center;">품명 및 규격</td>
                        <td style="border:1px solid #000; padding:10px; text-align:center; width:60px;">단위</td>
                        <td style="border:1px solid #000; padding:10px; text-align:center; width:50px;">수량</td>
                        <td style="border:1px solid #000; padding:10px; text-align:center; width:100px;">단가</td>
                        <td style="border:1px solid #000; padding:10px; text-align:center; width:100px;">합계금액</td>
                        <td style="border:1px solid #000; padding:10px; text-align:center; width:60px;">비고</td>
                    </tr>
                </thead>
                <tbody style="min-height:300px;">
                    ${itemRows}
                    <!-- 빈 행 추가 (레이아웃 조절용) -->
                    ${Array(Math.max(0, 10 - cart.length)).fill(0).map(() => `<tr><td style="border:1px solid #000; height:30px;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td></tr>`).join('')}
                </tbody>
                <tfoot>
                    <tr style="background:#f9f9f9; font-weight:700;">
                        <td colspan="2" style="border:1px solid #000; padding:12px; text-align:center; font-size:14px;">합 계 (TOTAL)</td>
                        <td colspan="5" style="border:1px solid #000; padding:12px; text-align:right; font-size:16px;">￦ ${total.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top:20px; border:1px solid #ddd; padding:15px; border-radius:5px; line-height:1.6; font-size:11px; color:#666;">
                <p>● <strong>유효기간</strong>: ${validStr}</p>
                <p>● <strong>기타문의</strong>: 고객센터 1544-5703으로 연락주시기 바랍니다.</p>
                <p>● <strong>결제계좌</strong>: (예금주:주식회사에스지라이뮤) 기업은행 010-1544-5703-00</p>
            </div>
        `;

        // 6. PDF 변환 및 다운로드
        const opt = {
            margin:       10,
            filename:     `견적서_${purchaserInfo.name}_${today.getTime()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (window.html2pdf) {
            await html2pdf().set(opt).from(element).save();
        } else {
            console.error('html2pdf 라이브러리를 찾을 수 없습니다.');
            alert('PDF 생성 도구를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }

    } catch (err) {
        console.error('PDF 생성 중 오류:', err);
        alert('견적서 생성 중 오류가 발생했습니다.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// [신규] 상세페이지 바로구매(결제창 즉시 이동) 처리용 전역 함수
window.buyNowDirect = async function(item) {
    let cart = getCart();
    // 동일 상품 및 동일 옵션 존재 여부 확인
    const existing = cart.find(x => x.id === item.id && x.optionColor === item.optionColor && x.optionSize === item.optionSize);
    if (existing) {
        existing.qty += item.qty;
    } else {
        cart.push(item);
    }
    saveCart(cart);
    renderCart();

    const checkoutOverlay = document.getElementById('checkoutOverlay');
    const checkoutMsg = document.getElementById('checkoutMsg');
    
    let total = 0;
    cart.forEach(x => total += x.price * x.qty);
    document.getElementById('checkoutTotalPrice').innerText = total.toLocaleString() + '원';
    
    if (checkoutMsg) {
        checkoutMsg.className = 'auth-message';
        checkoutMsg.style.display = 'none';
        checkoutMsg.textContent = '';
    }

    checkoutOverlay.style.display = 'flex';
    
    if (window.supabase) {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    if (document.getElementById('checkoutName')) document.getElementById('checkoutName').value = profile.full_name || '';
                    if (document.getElementById('checkoutPhone')) document.getElementById('checkoutPhone').value = profile.phone || '';
                    if (document.getElementById('checkoutEmail')) document.getElementById('checkoutEmail').value = user.email || '';
                    if (document.getElementById('checkoutOrg')) document.getElementById('checkoutOrg').value = profile.organization || '';
                    if (document.getElementById('checkoutAddress')) document.getElementById('checkoutAddress').value = profile.address || '';
                }
            }
        } catch (err) {
            console.error('Failed to pre-fill user info:', err);
        }
    }
};
