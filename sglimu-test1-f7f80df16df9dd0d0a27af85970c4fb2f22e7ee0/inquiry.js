// inquiry.js - 실시간 견적/문의 모달 로직 (고객용)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// SG LIMU Supabase 연결정보 (퍼블릭 Key)
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // 1. 팝업창 HTML을 바디 맨 끝에 주입
    const inquiryHTML = `
        <div id="inquiryOverlay" class="inquiry-overlay">
            <div class="inquiry-box">
                <div class="inquiry-header">
                    <h3><i class="fa-solid fa-headset"></i> 제품 견적/상담 문의</h3>
                    <button class="inquiry-close" id="inquiryCloseBtn">&times;</button>
                </div>
                <div class="inquiry-body">
                    <p style="margin-bottom:20px; font-size:0.95rem; color:#666; line-height:1.5;">필요하신 제품과 요구사항을 남겨주시면, SG LIMU 담당자가 빠르게 확인 후 답변해 드립니다.</p>
                    
                    <div class="inquiry-form-group">
                        <label>고객명 / 소속 기관명 *</label>
                        <input type="text" id="inqAuthor" class="inquiry-control" placeholder="예: 홍길동 / 백두도서관">
                    </div>
                    <div class="inquiry-form-group">
                        <label>연락처 (휴대폰 또는 유선) *</label>
                        <input type="text" id="inqPhone" class="inquiry-control" placeholder="예: 010-1234-5678">
                    </div>
                    <div class="inquiry-form-group">
                        <label>문의 제품 및 상세 내용 *</label>
                        <textarea id="inqTitle" class="inquiry-control" rows="4" placeholder="견적이 필요한 수량, 배송 지역, 기타 궁금하신 점을 자유롭게 입력해 주세요."></textarea>
                    </div>
                </div>
                <div class="inquiry-footer">
                    <button class="btn-inquiry-submit" id="inquirySubmitBtn">상담/견적 요청 접수하기</button>
                    <p class="inquiry-desc" id="inquiryStatusMsg">* 입력하신 정보는 원활한 상담을 위해서만 활용됩니다.</p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', inquiryHTML);

    const overlay = document.getElementById('inquiryOverlay');
    const closeBtn = document.getElementById('inquiryCloseBtn');
    const submitBtn = document.getElementById('inquirySubmitBtn');
    const statusMsg = document.getElementById('inquiryStatusMsg');

    const inqAuthor = document.getElementById('inqAuthor');
    const inqPhone = document.getElementById('inqPhone');
    const inqTitle = document.getElementById('inqTitle');

    // 2. 화면의 [견적문의] 버튼들에 이벤트 연결
    // koas-cam.html 등의 버튼 클래스는 btn-buy 로 되어있음
    const buyBtns = document.querySelectorAll('.btn-buy');
    
    buyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // 가격 책정 여부 확인
            const priceElem = document.querySelector('.product-price');
            const priceText = priceElem ? priceElem.innerText.trim() : '';
            const priceNum = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
            const isConsultationOnly = !priceElem || priceText.includes('전화문의') || priceNum === 0;

            // 보고 있던 상품명 가져오기
            const TitleEl = document.querySelector('.product-title');
            let pName = TitleEl ? TitleEl.innerText.trim() : document.title;
            if (!TitleEl && pName.includes(' - 에스지라이뮤')) {
                pName = pName.replace(' - 에스지라이뮤', '');
            }
            
            // 상세페이지의 색상/사이즈 옵션 수집
            const colorSelect = document.getElementById('colorOption');
            const sizeSelect = document.getElementById('sizeOption');
            let selectedOptions = [];
            let optPrice = 0;
            let colorText = '';
            let sizeText = '';
            
            if (colorSelect && colorSelect.value && colorSelect.value !== '0|') {
                const optText = colorSelect.options[colorSelect.selectedIndex].text;
                selectedOptions.push(`색상: ${optText}`);
                
                const parts = colorSelect.value.split('|');
                optPrice += parseInt(parts[0]) || 0;
                colorText = optText.split(' (+')[0];
            }
            if (sizeSelect && sizeSelect.value && sizeSelect.value !== '0|') {
                const optText = sizeSelect.options[sizeSelect.selectedIndex].text;
                selectedOptions.push(`사이즈: ${optText}`);
                
                const parts = sizeSelect.value.split('|');
                optPrice += parseInt(parts[0]) || 0;
                sizeText = optText.split(' (+')[0];
            }

            if (!isConsultationOnly) {
                // 가격이 측정되어 있는 상품 -> 바로 결제/주문서 작성 모달로 이동
                if (typeof window.handleDirectBuy === 'function') {
                    window.handleDirectBuy();
                    return;
                }
                
                const qtyInput = document.getElementById('qtyInput');
                const qty = qtyInput ? parseInt(qtyInput.value) : 1;
                
                const urlParams = new URLSearchParams(window.location.search);
                const productId = urlParams.get('id');
                
                const unitPrice = (window.basePrice || 0) + optPrice;
                
                const mainImg = document.getElementById('mainImage');
                const imgUrl = mainImg ? mainImg.src : 'assets/no-image.png';

                if (window.buyNowDirect) {
                    window.buyNowDirect({
                        id: productId || 'custom-product',
                        name: pName,
                        price: unitPrice,
                        qty: qty,
                        image: imgUrl,
                        optionColor: colorText,
                        optionSize: sizeText
                    });
                }
                return;
            }
            
            // 가격이 없는 상품(전화문의) -> 견적/상담요청 팝업 모달 켜기
            let optionStr = selectedOptions.length > 0 ? ` (옵션: ${selectedOptions.join(', ')})` : '';
            
            inqTitle.value = `[문의상품: ${pName}${optionStr}]\n\n`; // 내용에 상품명 및 옵션 자동 기입
            inqAuthor.value = '';
            inqPhone.value = '';
            statusMsg.textContent = '* 입력하신 정보는 원활한 상담을 위해서만 활용됩니다.';
            statusMsg.style.color = '#7f8c8d';
            
            overlay.classList.add('active'); // 모달 켜기
        });
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
    overlay.addEventListener('click', (e) => {
        if(e.target === overlay) overlay.classList.remove('active');
    });

    // 3. 폼 전송버튼 (Supabase Insert 로직)
    submitBtn.addEventListener('click', async () => {
        const authorVal = inqAuthor.value.trim();
        const phoneVal = inqPhone.value.trim();
        const titleVal = inqTitle.value.trim();

        if(!authorVal || !phoneVal || !titleVal) {
            statusMsg.textContent = '❌ 필수 입력 항목을 모두 채워주세요.';
            statusMsg.style.color = '#e74c3c';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '정보 전송 중...';

        try {
            const { data, error } = await supabase
                .from('inquiries')
                .insert([{
                    author: authorVal,
                    phone: phoneVal,
                    title: titleVal,
                    status: 'open'
                }]);

            if (error) throw error;

            statusMsg.textContent = '✅ 견적 문의가 성공적으로 접수되었습니다! 곧 연락드리겠습니다.';
            statusMsg.style.color = '#8ec342';
            
            // 2초 뒤 모달 닫기
            setTimeout(() => {
                overlay.classList.remove('active');
                submitBtn.disabled = false;
                submitBtn.textContent = '상담/견적 요청 접수하기';
            }, 2000);

        } catch (err) {
            console.error('Inquiry Error:', err);
            statusMsg.textContent = '❌ 전송에 실패했습니다. 네트워크를 확인해주세요.';
            statusMsg.style.color = '#e74c3c';
            submitBtn.disabled = false;
            submitBtn.textContent = '재시도하기';
        }
    });
});
