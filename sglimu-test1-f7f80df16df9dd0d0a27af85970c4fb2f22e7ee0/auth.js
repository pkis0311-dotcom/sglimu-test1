import { supabase } from './supabase-client.js';

// ==========================================
// 📱 SNS SDK Dynamic Loading & Initialization
// ==========================================
const KAKAO_JS_KEY = 'afd6cc8f3b753cd6907f9eeadeac2342';
let naverLogin;

function initKakaoSDK() {
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
        Kakao.init(KAKAO_JS_KEY);
        console.log('Kakao SDK Initialized:', Kakao.isInitialized());
    }
}

function initNaverSDK() {
    if (typeof naver !== 'undefined') {
        naverLogin = new naver.LoginWithNaverId({
            clientId: "lBnHMycgXAwZ3xqyXLTp", // TODO: 실제 네이버 Client ID로 교체 필요
            callbackUrl: window.location.origin + window.location.pathname,
            isPopup: false,
            loginButton: { color: "green", type: 3, height: 60 }
        });
        naverLogin.init();
        console.log('Naver SDK Initialized');
    }
}

function loadSDKSocial() {
    // Kakao
    if (typeof Kakao === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js';
        script.onload = initKakaoSDK;
        document.head.appendChild(script);
    } else {
        initKakaoSDK();
    }

    // Naver
    if (typeof naver === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://static.nid.naver.com/js/naveridlogin_js_sdk_2.0.2.js';
        script.charset = 'utf-8';
        script.onload = initNaverSDK;
        document.head.appendChild(script);
    } else {
        initNaverSDK();
    }
}

loadSDKSocial();

// ==========================================
// 📱 Dynamic Auth Modal Injection
// ==========================================
function ensureAuthModalInDOM() {
    const existing = document.getElementById('authOverlay');
    if (existing) {
        existing.remove(); // 기존 하드코딩된 (구버전/불완전) 모달 제거
    }

    const modalHTML = `
    <div class="auth-overlay" id="authOverlay">
        <div class="auth-modal">
            <div class="auth-close" id="authClose">&times;</div>
            <div class="auth-tabs">
                <div class="auth-tab active" data-target="loginPane">로그인</div>
                <div class="auth-tab" data-target="signupPane">회원가입</div>
            </div>
            <div class="auth-content">
                <div class="auth-pane active" id="loginPane">
                    <div class="auth-header"><h2>환영합니다!</h2><p>간편로그인으로 빠르게 시작하세요.</p></div>
                    <div class="social-login-grid">
                        <button class="social-btn btn-kakao" id="kakaoLoginBtn"><i class="fa-solid fa-comment"></i> 카카오 로그인</button>
                        <button class="social-btn btn-naver" id="naverLoginBtn"><i class="fa-solid fa-n" style="font-size: 0.8rem;"></i> 네이버 로그인</button>
                        <div id="naverIdLogin" style="display:none;"></div> 
                    </div>
                    <div class="auth-divider"><span>또는</span></div>
                    <form id="loginForm">
                        <div class="auth-form-group"><label>이메일</label><input type="email" id="loginEmail" class="auth-input" placeholder="example@email.com" required></div>
                        <div class="auth-form-group"><label>비밀번호</label><input type="password" id="loginPassword" class="auth-input" placeholder="비밀번호를 입력하세요" required></div>
                        <button type="submit" class="auth-submit-btn">로그인</button>
                    </form>
                    <div id="loginMsg" class="auth-message"></div>
                    <div class="auth-sub-links">
                        <a id="linkFindId">아이디 찾기</a>
                        <span class="divider">|</span>
                        <a id="linkFindPw">비밀번호 찾기</a>
                    </div>
                </div>
                
                <!-- Find ID Pane -->
                <div class="auth-pane" id="findIdPane">
                    <div class="auth-header"><h2>아이디 찾기</h2><p>가입 시 입력한 이름과 전화번호를 입력해주세요.</p></div>
                    <form id="findIdForm">
                        <div class="auth-form-group"><label>이름</label><input type="text" id="findIdName" class="auth-input" placeholder="이름을 입력하세요" required></div>
                        <div class="auth-form-group"><label>전화번호</label><input type="tel" id="findIdPhone" class="auth-input" placeholder="010-0000-0000" required></div>
                        <button type="submit" class="auth-submit-btn">아이디 찾기</button>
                    </form>
                    <div id="findIdMsg" class="auth-message"></div>
                    <div id="findIdResult" class="auth-result-box">
                        <h4>아이디 찾기 완료</h4>
                        <p>회원님의 아이디(이메일)는 다음과 같습니다.</p>
                        <div class="found-email" id="foundEmailDisplay"></div>
                        <button class="auth-submit-btn" id="btnGoToLoginFromId">로그인하러 가기</button>
                    </div>
                    <div class="auth-sub-links">
                        <a class="back-to-login">로그인으로 돌아가기</a>
                    </div>
                </div>

                <!-- Find Password Pane -->
                <div class="auth-pane" id="findPwPane">
                    <div class="auth-header"><h2>비밀번호 찾기</h2><p>가입된 이메일과 이름, 전화번호를 입력하시면<br>비밀번호 재설정 링크를 보내드립니다.</p></div>
                    <form id="findPwForm">
                        <div class="auth-form-group"><label>이메일(아이디)</label><input type="email" id="findPwEmail" class="auth-input" placeholder="example@email.com" required></div>
                        <div class="auth-form-group"><label>이름</label><input type="text" id="findPwName" class="auth-input" placeholder="이름을 입력하세요" required></div>
                        <div class="auth-form-group"><label>전화번호</label><input type="tel" id="findPwPhone" class="auth-input" placeholder="010-0000-0000" required></div>
                        <button type="submit" class="auth-submit-btn">재설정 링크 발송</button>
                    </form>
                    <div id="findPwMsg" class="auth-message"></div>
                    <div id="findPwResult" class="auth-result-box">
                        <h4>이메일 발송 완료</h4>
                        <p>입력하신 이메일로 비밀번호 재설정 링크가 발송되었습니다.<br>이메일을 확인해주세요.</p>
                        <button class="auth-submit-btn back-to-login">로그인으로 돌아가기</button>
                    </div>
                    <div class="auth-sub-links">
                        <a class="back-to-login">로그인으로 돌아가기</a>
                    </div>
                </div>

                <!-- Reset Password Pane -->
                <div class="auth-pane" id="resetPwPane">
                    <div class="auth-header"><h2>비밀번호 재설정</h2><p>새로운 비밀번호를 입력해주세요.</p></div>
                    <form id="resetPwForm">
                        <div class="auth-form-group"><label>새 비밀번호</label><input type="password" id="resetPwInput" class="auth-input" placeholder="6자 이상 입력" minlength="6" required></div>
                        <div class="auth-form-group"><label>새 비밀번호 확인</label><input type="password" id="resetPwConfirm" class="auth-input" placeholder="다시 한 번 입력" minlength="6" required></div>
                        <button type="submit" class="auth-submit-btn">비밀번호 변경</button>
                    </form>
                    <div id="resetPwMsg" class="auth-message"></div>
                </div>

                <!-- Signup Pane -->
                <div class="auth-pane" id="signupPane">
                    <div class="auth-header"><h2>회원가입</h2><p>간단한 정보 입력으로 더 많은 혜택을 누리세요.</p></div>
                    <div class="auth-social-signup">
                        <div class="auth-social-signup-header"><span>간편 회원가입</span></div>
                        <div class="social-login-grid">
                            <button class="social-btn btn-kakao social-signup-btn" data-provider="kakao"><i class="fa-solid fa-comment"></i> 카카오로 시작</button>
                            <button class="social-btn btn-naver social-signup-btn" data-provider="naver"><i class="fa-solid fa-n" style="font-size: 0.8rem;"></i> 네이버로 시작</button>
                        </div>
                    </div>
                    <div class="auth-divider"><span>또는 이메일로 가입</span></div>
                    <div class="auth-type-selector" id="userTypeSelector">
                        <div class="auth-type-btn active" data-type="individual">개인 회원</div>
                        <div class="auth-type-btn" data-type="business">기관 / 사업자</div>
                    </div>
                    <form id="signupForm">
                        <div class="auth-row">
                            <div class="auth-form-group"><label>이름 *</label><input type="text" id="signupName" class="auth-input" placeholder="홍길동" required></div>
                            <div class="auth-form-group"><label>전화번호 *</label><input type="tel" id="signupPhone" class="auth-input" placeholder="010-0000-0000" required></div>
                        </div>
                        <div class="auth-form-group"><label>이메일 *</label><input type="email" id="signupEmail" class="auth-input" placeholder="example@email.com" required></div>
                        <div class="auth-row">
                            <div class="auth-form-group"><label>비밀번호 *</label><input type="password" id="signupPassword" class="auth-input" placeholder="6자 이상" minlength="6" required></div>
                            <div class="auth-form-group"><label>비밀번호 확인 *</label><input type="password" id="signupPasswordConfirm" class="auth-input" placeholder="한 번 더 입력" required></div>
                        </div>
                        <div class="auth-form-group" id="orgGroup"><label>소속기관 / 학교 / 도서관명</label><input type="text" id="signupOrg" class="auth-input" placeholder="예: 한국대학교 도서관"></div>
                        <div class="auth-form-group" id="bizGroup" style="display: none;"><label>사업자 등록번호</label><input type="text" id="signupBizNumber" class="auth-input" placeholder="000-00-00000"></div>
                        <div class="auth-form-group"><label>배송/방문용 주소</label><input type="text" id="signupAddress" class="auth-input" placeholder="전체 주소를 입력하세요"></div>
                        <button type="submit" class="auth-submit-btn">가입하기</button>
                    </form>
                    <div id="signupMsg" class="auth-message"></div>
                </div>
                
                <!-- Complete Profile Pane -->
                <div class="auth-pane" id="completeProfilePane">
                    <div class="auth-header"><h2>추가 정보 입력</h2><p>원활한 서비스 이용을 위해 필수 정보를 입력해 주세요.</p></div>
                    <form id="completeProfileForm">
                        <div class="highlight-box">
                            <div class="auth-form-group"><label>전화번호 *</label><input type="tel" id="completePhone" class="auth-input" placeholder="010-0000-0000" required></div>
                            <div class="auth-form-group"><label>소속기관 / 학교 / 도서관명 *</label><input type="text" id="completeOrg" class="auth-input" placeholder="예: 한국대학교 도서관" required></div>
                            <div class="auth-form-group"><label>배송/방문용 주소</label><input type="text" id="completeAddress" class="auth-input" placeholder="전체 주소를 입력하세요"></div>
                        </div>
                        <button type="submit" class="auth-submit-btn">정보 저장 및 시작하기</button>
                    </form>
                    <div id="completeMsg" class="auth-message"></div>
                </div>
                
                <!-- My Profile Pane -->
                <div class="auth-pane" id="myProfilePane">
                    <div class="auth-header">
                        <h2>내 정보 관리</h2>
                        <p>회원 정보를 확인하고 수정할 수 있습니다.</p>
                    </div>
                    <form id="myProfileForm">
                        <div class="auth-form-group">
                            <label>이름</label>
                            <input type="text" id="myProfileName" class="auth-input" placeholder="이름" required>
                        </div>
                        <div class="auth-form-group">
                            <label>연락처</label>
                            <input type="tel" id="myProfilePhone" class="auth-input" placeholder="010-0000-0000" required>
                        </div>
                        <div class="auth-form-group">
                            <label>소속 기관 / 학교명</label>
                            <input type="text" id="myProfileOrg" class="auth-input" placeholder="예: 시립도서관" required>
                        </div>
                        <div class="auth-form-group">
                            <label>주소</label>
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <input type="text" id="myProfileAddress" class="auth-input" placeholder="주소를 검색하세요" required readonly style="background: #f7f9fa; cursor: pointer;">
                                <button type="button" id="btnSearchAddressProfile" class="auth-submit-btn" style="width: auto; margin-top: 0; padding: 0 15px; font-size: 0.85rem; white-space: nowrap;">주소 검색</button>
                            </div>
                            <input type="text" id="myProfileAddressDetail" class="auth-input" placeholder="상세 주소를 입력하세요">
                        </div>
                        <button type="submit" class="auth-submit-btn">정보 수정하기</button>
                    </form>
                    <div id="myProfileMsg" class="auth-message"></div>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

ensureAuthModalInDOM();

// DOM Elements
const authOverlay = document.getElementById('authOverlay');
const loginTriggerBtn = document.getElementById('loginTriggerBtn');
const authClose = document.getElementById('authClose');
const authTabs = document.querySelectorAll('.auth-tab');
const authPanes = document.querySelectorAll('.auth-pane');

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginMsg = document.getElementById('loginMsg');
const signupMsg = document.getElementById('signupMsg');

const userAuthWrap = document.getElementById('userAuthWrap');

// Social Login Buttons
const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
const naverLoginBtn = document.getElementById('naverLoginBtn');
const socialSignupBtns = document.querySelectorAll('.social-signup-btn');

// Find ID / PW Elements
const linkFindId = document.getElementById('linkFindId');
const linkFindPw = document.getElementById('linkFindPw');
const backToLoginBtns = document.querySelectorAll('.back-to-login');
const btnGoToLoginFromId = document.getElementById('btnGoToLoginFromId');

const findIdForm = document.getElementById('findIdForm');
const findPwForm = document.getElementById('findPwForm');
const resetPwForm = document.getElementById('resetPwForm');

const findIdMsg = document.getElementById('findIdMsg');
const findPwMsg = document.getElementById('findPwMsg');
const resetPwMsg = document.getElementById('resetPwMsg');

const findIdResult = document.getElementById('findIdResult');
const findPwResult = document.getElementById('findPwResult');
const foundEmailDisplay = document.getElementById('foundEmailDisplay');

// ==========================================
// 1. Modal & Tab Logic
// ==========================================
function openAuthModal(tab = 'loginPane') {
    if (!authOverlay) {
        console.error('authOverlay not found in DOM!');
        return;
    }
    authOverlay.style.display = 'flex';

    // 추가 정보 입력창 또는 내 정보 관리창인 경우 상단 탭 숨김
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) {
        tabs.style.display = (tab === 'completeProfilePane' || tab === 'myProfilePane') ? 'none' : 'flex';
    }

    switchTab(tab);
}

function closeAuthModal() {
    if (!authOverlay) return;
    authOverlay.style.display = 'none';
}

function switchTab(targetId) {
    authTabs.forEach(tab => {
        if (tab.dataset.target === targetId) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    authPanes.forEach(pane => {
        if (pane.id === targetId) pane.classList.add('active');
        else pane.classList.remove('active');
    });
}

if (loginTriggerBtn) loginTriggerBtn.addEventListener('click', () => openAuthModal());
if (authClose) authClose.addEventListener('click', closeAuthModal);
if (authOverlay) {
    let isMouseDownOnOverlay = false;
    authOverlay.addEventListener('mousedown', (e) => {
        isMouseDownOnOverlay = (e.target === authOverlay);
    });
    authOverlay.addEventListener('mouseup', (e) => {
        if (isMouseDownOnOverlay && e.target === authOverlay) {
            closeAuthModal();
        }
        isMouseDownOnOverlay = false;
    });
}

authTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.target));
});

if (linkFindId) linkFindId.addEventListener('click', () => switchTab('findIdPane'));
if (linkFindPw) linkFindPw.addEventListener('click', () => switchTab('findPwPane'));
if (backToLoginBtns) backToLoginBtns.forEach(btn => btn.addEventListener('click', () => switchTab('loginPane')));
if (btnGoToLoginFromId) btnGoToLoginFromId.addEventListener('click', () => switchTab('loginPane'));

// User Type Selection
let selectedUserType = 'individual';
const typeBtns = document.querySelectorAll('.auth-type-btn');
const bizGroup = document.getElementById('bizGroup');

if (typeBtns) {
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedUserType = btn.dataset.type;

            if (bizGroup) {
                bizGroup.style.display = (selectedUserType === 'business') ? 'block' : 'none';
            }
        });
    });
}

// ==========================================
// 2. Auth Logic - Social
// ==========================================
async function signInWithSocial(provider) {
    localStorage.setItem('pending_user_type', selectedUserType);

    console.log(`Starting login with ${provider}...`);
    const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        console.error('Login Error:', error);
        alert(`${provider} 로그인 오류: ` + error.message);
    }
}

if (kakaoLoginBtn) kakaoLoginBtn.addEventListener('click', () => signInWithSocial('kakao'));
// 2. 네이버 로그인 버튼 클릭 이벤트 연결 (이벤트 위임 방식)
document.addEventListener('click', (e) => {
    const naverBtn = e.target.closest('.btn-naver');
    if (naverBtn) {
        e.preventDefault();
        console.log('네이버 버튼 클릭됨');
        localStorage.setItem('pending_user_type', selectedUserType);
        if (naverLogin) {
            const naverActualBtn = document.getElementById('naverIdLogin')?.firstChild;
            if (naverActualBtn) naverActualBtn.click();
            else {
                const url = `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${naverLogin.clientId}&redirect_uri=${encodeURIComponent(naverLogin.callbackUrl)}&state=${Math.random().toString(36).substr(2)}`;
                window.location.href = url;
            }
        }
    }
});


if (socialSignupBtns) {
    socialSignupBtns.forEach(btn => {
        btn.addEventListener('click', () => signInWithSocial(btn.dataset.provider));
    });
}

// ==========================================
// 3. Auth Logic - Email/PW & Profile
// ==========================================

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const phone = document.getElementById('signupPhone').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm')?.value;
        const organization = document.getElementById('signupOrg')?.value;
        const bizNumber = document.getElementById('signupBizNumber')?.value;
        const address = document.getElementById('signupAddress')?.value;

        if (signupMsg) signupMsg.className = 'auth-message';

        if (passwordConfirm && password !== passwordConfirm) {
            if (signupMsg) {
                signupMsg.textContent = '비밀번호가 일치하지 않습니다.';
                signupMsg.classList.add('error');
            }
            return;
        }

        if (signupMsg) signupMsg.textContent = '가입 처리 중...';

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    organization: organization,
                    address: address,
                    user_type: selectedUserType,
                    biz_number: bizNumber
                }
            }
        });

        if (error) {
            console.error('Sign-up error detail:', error);
            if (signupMsg) {
                signupMsg.textContent = '가입 오류: ' + (error.message || JSON.stringify(error));
                signupMsg.classList.add('error');
            }
        } else {
            // [추가] 가입 성공 시 profiles 테이블에 기본 레코드 생성 시도
            if (data.user) {
                const initialProfile = {
                    id: data.user.id,
                    full_name: name,
                    phone: phone,
                    email: email,
                    organization: organization,
                    address: address,
                    user_type: selectedUserType,
                    updated_at: new Date().toISOString()
                };
                supabase.from('profiles').upsert(initialProfile).then(({ error }) => {
                    if (error) console.error('Initial profile creation error:', error);
                });
            }

            if (signupMsg) {
                signupMsg.textContent = '가입 성공! 가입하신 이메일로 인증 메일이 발송되었습니다. 메일함의 인증 링크를 클릭한 후 로그인해 주세요.';
                signupMsg.classList.add('success');
            }
            signupForm.reset();
        }
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (loginMsg) {
            loginMsg.className = 'auth-message';
            loginMsg.textContent = '로그인 중...';
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (loginMsg) {
                if (error.message.includes('Email not confirmed') || error.message.includes('confirm your email') || error.message.includes('confirmed')) {
                    loginMsg.textContent = '이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해 주세요.';
                } else {
                    loginMsg.textContent = '로그인 실패: ' + error.message;
                }
                loginMsg.classList.add('error');
            }
        } else {
            // 이중 체크: 만약 세션이 생성되었는데 email_confirmed_at이 비어 있는 경우 로그아웃 처리
            if (data.user && !data.user.email_confirmed_at) {
                await supabase.auth.signOut();
                if (loginMsg) {
                    loginMsg.textContent = '이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해 주세요.';
                    loginMsg.classList.add('error');
                }
                return;
            }

            // 이메일이 profile에 없으면 채워주는 자가 치유 로직
            if (data.user && data.user.email) {
                supabase.from('profiles').update({ email: data.user.email }).eq('id', data.user.id).then();
            }

            if (loginMsg) {
                loginMsg.textContent = '반갑습니다! 로그인 성공.';
                loginMsg.classList.add('success');
            }
            setTimeout(() => {
                closeAuthModal();
                updateAuthUI(data.user);
            }, 1000);
        }
    });
}

const completeProfileForm = document.getElementById('completeProfileForm');
const completeMsg = document.getElementById('completeMsg');

if (completeProfileForm) {
    completeProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('completePhone').value;
        const org = document.getElementById('completeOrg').value;
        const address = document.getElementById('completeAddress').value;
        const userType = localStorage.getItem('pending_user_type') || 'individual';

        if (completeMsg) {
            completeMsg.className = 'auth-message';
            completeMsg.textContent = '저장 중...';
        }

        const { data: { user } } = await supabase.auth.getUser();
        let targetId = user?.id;
        if (!targetId && typeof naverLogin !== 'undefined' && naverLogin.user) {
            targetId = naverLogin.user.id;
        }
        if (!targetId) return;

        const profileData = {
            id: targetId,
            full_name: user?.user_metadata?.full_name || naverLogin?.user?.name || '유저',
            email: user?.email || naverLogin?.user?.email,
            phone: phone,
            organization: org,
            address: address,
            user_type: userType,
            updated_at: new Date().toISOString()
        };

        // 프로필 업데이트 (기본값인 id를 기준으로 덮어쓰기 처리)
        const { error } = await supabase.from('profiles').upsert(profileData);

        if (error) {
            if (completeMsg) {
                completeMsg.textContent = '저장 실패: ' + error.message;
                completeMsg.classList.add('error');
            }
        } else {
            if (completeMsg) {
                completeMsg.textContent = '저장 완료! 환영합니다.';
                completeMsg.classList.add('success');
            }
            // 세션 체크 완료 플래그 설정
            sessionStorage.setItem('profile_check_done', 'true');

            setTimeout(() => {
                closeAuthModal();
                window.location.reload();
            }, 1000);
        }
    });
}

// ==========================================
// 3.5 Find ID / Password Logic
// ==========================================

if (findIdForm) {
    findIdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('findIdName').value;
        const phone = document.getElementById('findIdPhone').value;

        if (findIdMsg) {
            findIdMsg.className = 'auth-message';
            findIdMsg.textContent = '조회 중...';
            findIdMsg.style.display = 'block';
            findIdResult.classList.remove('active');
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('full_name', name)
            .eq('phone', phone);

        if (error || !data || data.length === 0) {
            if (findIdMsg) {
                findIdMsg.textContent = '입력하신 정보와 일치하는 아이디를 찾을 수 없습니다.';
                findIdMsg.classList.add('error');
            }
        } else {
            const userEmail = data[0].email;
            if (findIdMsg) findIdMsg.style.display = 'none';
            if (findIdResult) {
                findIdResult.classList.add('active');
                if (foundEmailDisplay) {
                    foundEmailDisplay.textContent = userEmail || '이메일 정보 누락 (재가입 요망)';
                }
            }
        }
    });
}

if (findPwForm) {
    findPwForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('findPwEmail').value;
        const name = document.getElementById('findPwName').value;
        const phone = document.getElementById('findPwPhone').value;

        if (findPwMsg) {
            findPwMsg.className = 'auth-message';
            findPwMsg.textContent = '조회 중...';
            findPwMsg.style.display = 'block';
            findPwResult.classList.remove('active');
        }

        // 1. 프로필 테이블에서 정보 일치 여부 확인
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .eq('full_name', name)
            .eq('phone', phone)
            .single();

        if (error || !data) {
            if (findPwMsg) {
                findPwMsg.textContent = '입력하신 정보와 일치하는 회원 정보가 없습니다.';
                findPwMsg.classList.add('error');
            }
        } else {
            if (findPwMsg) findPwMsg.textContent = '비밀번호 재설정 이메일을 발송 중입니다...';
            
            // 2. 이메일 발송
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });

            if (resetError) {
                if (findPwMsg) {
                    findPwMsg.textContent = '이메일 발송 실패: ' + resetError.message;
                    findPwMsg.classList.add('error');
                }
            } else {
                if (findPwMsg) findPwMsg.style.display = 'none';
                if (findPwResult) findPwResult.classList.add('active');
            }
        }
    });
}

if (resetPwForm) {
    resetPwForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('resetPwInput').value;
        const passwordConfirm = document.getElementById('resetPwConfirm').value;

        if (resetPwMsg) resetPwMsg.className = 'auth-message';

        if (password !== passwordConfirm) {
            if (resetPwMsg) {
                resetPwMsg.textContent = '비밀번호가 일치하지 않습니다.';
                resetPwMsg.classList.add('error');
            }
            return;
        }

        if (resetPwMsg) {
            resetPwMsg.textContent = '비밀번호 변경 중...';
            resetPwMsg.style.display = 'block';
        }

        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) {
            if (resetPwMsg) {
                resetPwMsg.textContent = '변경 실패: ' + error.message;
                resetPwMsg.classList.add('error');
            }
        } else {
            if (resetPwMsg) {
                resetPwMsg.textContent = '비밀번호가 성공적으로 변경되었습니다. 로그인 창으로 이동합니다.';
                resetPwMsg.classList.add('success');
            }
            setTimeout(() => {
                supabase.auth.signOut();
                window.location.reload();
            }, 2000);
        }
    });
}

// ==========================================
// 4. My Profile Management
// ==========================================
const myProfileForm = document.getElementById('myProfileForm');
const myProfileMsg = document.getElementById('myProfileMsg');

async function openMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('로그인이 필요합니다.');
        return;
    }

    if (myProfileMsg) myProfileMsg.textContent = '정보 불러오는 중...';
    openAuthModal('myProfilePane');

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        if (profile) {
            if (document.getElementById('myProfileName')) document.getElementById('myProfileName').value = profile.full_name || '';
            if (document.getElementById('myProfilePhone')) document.getElementById('myProfilePhone').value = profile.phone || '';
            if (document.getElementById('myProfileOrg')) document.getElementById('myProfileOrg').value = profile.organization || '';
            
            const rawAddress = profile.address || '';
            if (rawAddress.includes('||')) {
                const addrs = rawAddress.split('||');
                if (document.getElementById('myProfileAddress')) document.getElementById('myProfileAddress').value = addrs[0] || '';
                if (document.getElementById('myProfileAddressDetail')) document.getElementById('myProfileAddressDetail').value = addrs[1] || '';
            } else {
                if (document.getElementById('myProfileAddress')) document.getElementById('myProfileAddress').value = rawAddress;
                if (document.getElementById('myProfileAddressDetail')) document.getElementById('myProfileAddressDetail').value = '';
            }
        }
        if (myProfileMsg) myProfileMsg.textContent = '';
    } catch (err) {
        console.error('Profile fetch error:', err);
        if (myProfileMsg) {
            myProfileMsg.textContent = '정보를 불러오지 못했습니다.';
            myProfileMsg.classList.add('error');
        }
    }
}

if (myProfileForm) {
    myProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('myProfileName').value;
        const phone = document.getElementById('myProfilePhone').value;
        const org = document.getElementById('myProfileOrg').value;
        const addressBase = document.getElementById('myProfileAddress').value;
        const addressDetail = document.getElementById('myProfileAddressDetail').value;
        const address = addressDetail ? `${addressBase}||${addressDetail}` : addressBase;

        if (myProfileMsg) {
            myProfileMsg.className = 'auth-message';
            myProfileMsg.textContent = '정보 수정 중...';
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updateData = {
            id: user.id,
            full_name: name,
            phone: phone,
            organization: org,
            address: address,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('profiles').upsert(updateData);

        if (error) {
            if (myProfileMsg) {
                myProfileMsg.textContent = '수정 실패: ' + error.message;
                myProfileMsg.classList.add('error');
            }
        } else {
            if (myProfileMsg) {
                myProfileMsg.textContent = '성공적으로 수정되었습니다!';
                myProfileMsg.classList.add('success');
            }
            setTimeout(() => {
                closeAuthModal();
                window.location.reload();
            }, 1000);
        }
    });
}

// ==========================================
// 5. UI State Management
// ==========================================

async function checkProfileCompletion(user) {
    if (!user) return;

    // 세션당 한 번만 체크하여 자동 팝업 방지
    if (sessionStorage.getItem('profile_check_done')) {
        console.log('Profile already checked in this session.');
        return;
    }

    console.log('Checking profile completion for:', user.email);
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        return;
    }

    if (!profile || !profile.phone || !profile.organization) {
        console.log('Profile incomplete, opening completion pane.');
        // 유저가 다른 작업을 하고 있을 수 있으므로 약간의 지연 후 띄우기
        setTimeout(() => {
            // 현재 모달이 닫혀있는 상태일 때만 자동 팝업
            const overlay = document.getElementById('authOverlay');
            if (overlay && overlay.style.display !== 'flex') {
                console.log('Opening Profile Completion Modal');
                openAuthModal('completeProfilePane');
                sessionStorage.setItem('profile_check_done', 'true');
            }
        }, 1500);
    } else {
        console.log('Profile complete.');
        sessionStorage.setItem('profile_check_done', 'true');
    }
}

function updateAuthUI(user) {
    const wrap = document.getElementById('userAuthWrap');
    if (!wrap) {
        console.warn('userAuthWrap element not found in DOM!');
        return;
    }

    if (user) {
        console.log('Updating UI for logged-in user:', user.email);
        let userName = user.user_metadata?.full_name;
        if (!userName) {
            if (user.email && user.email.startsWith('naver_')) {
                userName = '네이버 회원';
            } else {
                userName = user.email?.split('@')[0] || '유저';
            }
        }

        wrap.innerHTML = `
            <div class="user-profile-nav">
                <div class="user-info-badge">
                    <i class="fa-solid fa-circle-user"></i>
                    <span class="user-name" id="topUserName"><b>${userName}</b> 님</span>
                </div>
                <div class="user-nav-actions">
                    <button class="nav-icon-btn" id="myProfileBtn" title="내 정보 관리">
                        <i class="fa-solid fa-gear"></i>
                    </button>
                    <button class="logout-btn" id="logoutBtn" title="로그아웃">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        `;

        // DB에서 최신 프로필 이름을 비동기로 가져와서 업데이트
        supabase.from('profiles').select('full_name').eq('id', user.id).single().then(({ data }) => {
            if (data && data.full_name && data.full_name !== '유저') {
                const nameEl = document.getElementById('topUserName');
                if (nameEl) nameEl.innerHTML = `<b>${data.full_name}</b> 님`;
            }
        }).catch(err => console.error(err));
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Logout error:', error);
                window.location.reload();
            });
        }

        const myProfileBtn = document.getElementById('myProfileBtn');
        if (myProfileBtn) {
            myProfileBtn.addEventListener('click', () => openMyProfile());
        }

        // 프로필 미완성 시 체크 (sessionStorage 활용)
        checkProfileCompletion(user);
    } else {
        console.log('Updating UI for guest user.');
        wrap.innerHTML = `
            <button class="login-trigger-btn" id="loginTriggerBtn">
                <i class="fa-regular fa-user"></i>
                <span>로그인</span>
            </button>
        `;
        const btn = document.getElementById('loginTriggerBtn');
        if (btn) btn.addEventListener('click', () => openAuthModal());
    }
}

// 초기 세션 확인 및 리스너 등록
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth State Changed:', event, session);
    if (event === 'PASSWORD_RECOVERY') {
        // 비밀번호 재설정 링크를 통해 들어왔을 때
        openAuthModal('resetPwPane');
    }
    if (session) {
        if (session.user && !session.user.email_confirmed_at) {
            console.log('Unconfirmed email detected, signing out...');
            supabase.auth.signOut().then(() => {
                updateAuthUI(null);
            });
            return;
        }
        updateAuthUI(session.user);
    } else {
        updateAuthUI(null);
    }
});

// 페이지 로드 시 즉시 실행
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Initial Session Check:', session);
    if (session) {
        if (session.user && !session.user.email_confirmed_at) {
            console.log('Unconfirmed email session on page load, signing out...');
            await supabase.auth.signOut();
            updateAuthUI(null);
        } else {
            updateAuthUI(session.user);
        }
    }

    // [네이버 추가] 페이지 로드 시 로그인 상태 확인 (Callback 처리)
    if (typeof naver !== 'undefined' && naverLogin) {
        naverLogin.getLoginStatus(async (status) => {
            if (status) {
                const naverUser = naverLogin.user;
                console.log('네이버 로그인 성공:', naverUser);

                // Supabase 유저 세션이 없는 경우에만 프로필 연동
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    // 무한 가입 시도(rate limit) 방지: 네이버에서 방금 넘어온 경우(해시 존재)에만 연동
                    if (window.location.hash.includes('access_token')) {
                        await handleNaverSocialLogin(naverUser);
                    } else {
                        // 세션은 없는데 네이버 토큰만 있는 경우(이메일 인증 미완료 등)
                        // 네이버 로컬 토큰을 지워서 다시 로그인 버튼을 누를 수 있도록 초기화
                        localStorage.removeItem('com.naver.nid.access_token');
                    }
                }
            }
        });
    }
});

// 네이버 정보를 이용한 프로필 연동 함수 (자동 가입/로그인 방식)
async function handleNaverSocialLogin(naverUser) {
    const { id, name } = naverUser;
    // 네이버 API에서 이메일 제공에 동의하지 않았을 경우를 대비해 고유 임시 이메일 생성
    const email = naverUser.email || `naver_${id}@social.sglimu.com`;
    const userType = localStorage.getItem('pending_user_type') || 'individual';

    console.log('네이버 유저 Supabase 공식 연동 시도...');

    // 1. 네이버 정보를 이용해 Supabase 로그인을 시도합니다.
    const secretPassword = `Naver_Auth_${id}`; 
    
    let { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: secretPassword,
    });

    // 2. 신규 유저인 경우 자동으로 회원가입 진행
    if (error) {
        console.log('신규 네이버 유저 가입 진행 중...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: secretPassword,
            options: {
                data: {
                    full_name: name,
                    user_type: userType
                }
            }
        });

        if (signUpError) {
            console.error('네이버 자동 가입 실패:', signUpError.message);
            if (signUpError.message.includes('rate limit')) {
                alert('로그인 시도 횟수를 초과했습니다(Rate Limit). 잠시 후 다시 시도해 주세요.');
            } else if (signUpError.message.includes('already registered')) {
                alert('이미 다른 방식으로 가입된 이메일입니다. 일반 로그인을 이용해 주세요.');
            } else {
                alert('로그인 처리 중 오류가 발생했습니다: ' + signUpError.message);
            }
            localStorage.removeItem('com.naver.nid.access_token');
            return;
        }
        data = signUpData;
        
        // 이메일 인증이 켜져있어 세션이 바로 생성되지 않는 경우
        if (data.user && !data.session) {
            alert('이메일 인증이 켜져 있어 로그인이 지연되었습니다.\nSupabase 대시보드 [Authentication] -> [Providers] -> [Email]에서 "Confirm email" 설정을 꺼주시면 네이버 연동이 즉시 로그인됩니다.');
            localStorage.removeItem('com.naver.nid.access_token');
            return;
        }
    }

    // 3. 세션 생성 성공 시 UI 업데이트 및 추가정보 확인
    if (data.user && data.session) {
        console.log('Supabase 세션 생성 성공!');
        updateAuthUI(data.user);
        
        // 4. 추가 정보 입력창 띄우기 (연락처/기관 정보 체크)
        await checkProfileCompletion(data.user);
    }

    // 5. 해시 제거
    if (window.location.hash) {
        window.history.replaceState(null, null, window.location.pathname);
    }
}

// Daum 우편번호 SDK 동적 로더 및 실행 헬퍼
function loadPostcodeSDK(callback) {
    if (window.daum && window.daum.Postcode) {
        if (callback) callback();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => {
        if (callback) callback();
    };
    document.head.appendChild(script);
}

function openDaumPostcode(addressInputId, detailInputId) {
    loadPostcodeSDK(() => {
        new daum.Postcode({
            oncomplete: function(data) {
                let addr = '';
                if (data.userSelectedType === 'R') {
                    addr = data.roadAddress;
                } else {
                    addr = data.jibunAddress;
                }
                const addrInput = document.getElementById(addressInputId);
                if (addrInput) {
                    addrInput.value = addr;
                }
                const detailInput = document.getElementById(detailInputId);
                if (detailInput) {
                    detailInput.value = '';
                    detailInput.focus();
                }
            }
        }).open();
    });
}

// 내 정보 수정 페이지 주소검색 리스너 바인딩
document.addEventListener('DOMContentLoaded', () => {
    const checkInterval = setInterval(() => {
        const btnSearch = document.getElementById('btnSearchAddressProfile');
        const addrInput = document.getElementById('myProfileAddress');
        if (btnSearch && addrInput) {
            btnSearch.addEventListener('click', (e) => {
                e.preventDefault();
                openDaumPostcode('myProfileAddress', 'myProfileAddressDetail');
            });
            addrInput.addEventListener('click', (e) => {
                e.preventDefault();
                openDaumPostcode('myProfileAddress', 'myProfileAddressDetail');
            });
            clearInterval(checkInterval);
        }
    }, 500);
});

