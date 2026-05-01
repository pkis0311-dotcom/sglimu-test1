// cart.js - 장바구니 로직 처리
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
                    <button class="btn-checkout" onclick="alert('결제 모듈은 준비중입니다.')">장바구니 결제하기</button>
                    <button class="btn-quote" id="btnCartQuote">견적서 자동 발행 (PDF)</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', cartHTML);

    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');
    
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

    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', (e) => {
        if(e.target === cartOverlay) closeCart();
    });

    // 화면의 모든 장바구니 담기(.btn-cart) 버튼 연동
    const addCartBtns = document.querySelectorAll('.btn-cart');
    addCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // 상품 상세 페이지일 경우 정보 자동수집
            const TitleEl = document.querySelector('.product-title h1');
            const PriceEl = document.querySelector('.product-price');
            
            const pName = TitleEl ? TitleEl.innerText : document.title;
            const pPriceRaw = PriceEl ? PriceEl.innerText.replace(/[^0-9]/g, '') : "0";
            const pPrice = parseInt(pPriceRaw) || 0;
            
            const item = {
                id: pName + '_' + new Date().getTime(),
                name: pName,
                price: pPrice,
                qty: 1
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
    // 중복 상품이 있다면 수량만 증가
    let existingItem = cart.find(item => item.name === newItem.name && item.price === newItem.price);
    
    if(existingItem) {
        existingItem.qty += 1;
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
