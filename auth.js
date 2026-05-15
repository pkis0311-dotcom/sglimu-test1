import { supabase } from './supabase-client.js';

// ==========================================
// 📱 Kakao SDK Initialization
// ==========================================
const KAKAO_JS_KEY = 'afd6cc8f3b753cd6907f9eeadeac2342';
if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
    Kakao.init(KAKAO_JS_KEY);
    console.log('Kakao SDK Initialized:', Kakao.isInitialized());
}

// ==========================================
// 📱 Naver SDK Initialization
// ==========================================
let naverLogin;
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
const googleLoginBtn = document.getElementById('googleLoginBtn');
const socialSignupBtns = document.querySelectorAll('.social-signup-btn');

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
if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => signInWithSocial('google'));

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
            if (signupMsg) {
                signupMsg.textContent = '가입 오류: ' + error.message;
                signupMsg.classList.add('error');
            }
        } else {
            // [추가] 가입 성공 시 profiles 테이블에 기본 레코드 생성 시도
            if (data.user) {
                const initialProfile = {
                    id: data.user.id,
                    full_name: name,
                    phone: phone,
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
                signupMsg.textContent = '가입 성공! 이메일을 확인하거나 로그인해 주세요.';
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
                loginMsg.textContent = '로그인 실패: ' + error.message;
                loginMsg.classList.add('error');
            }
        } else {
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

        // 네이버 유저의 경우 ID가 UUID가 아니므로, email을 기준으로 upsert 처리
        const { error } = await supabase.from('profiles').upsert(profileData, { onConflict: 'email' });

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
            if (document.getElementById('myProfileAddress')) document.getElementById('myProfileAddress').value = profile.address || '';
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
        const address = document.getElementById('myProfileAddress').value;

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
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || '유저';
        wrap.innerHTML = `
            <div class="user-profile-nav">
                <div class="user-info-badge">
                    <i class="fa-solid fa-circle-user"></i>
                    <span class="user-name"><b>${userName}</b> 님</span>
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
    if (session) {
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
        updateAuthUI(session.user);
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
                    await handleNaverSocialLogin(naverUser);
                }
            }
        });
    }
});

// 네이버 정보를 이용한 프로필 연동 함수 (자동 가입/로그인 방식)
async function handleNaverSocialLogin(naverUser) {
    const { email, name, id } = naverUser;
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
            // 만약 이미 가입된 이메일인데 비밀번호가 다른 경우 등에 대한 예외 처리
            if (signUpError.message.includes('already registered')) {
                alert('이미 다른 방식으로 가입된 이메일입니다. 일반 로그인을 이용해 주세요.');
            } else {
                alert('로그인 처리 중 오류가 발생했습니다: ' + signUpError.message);
            }
            return;
        }
        data = signUpData;
    }

    // 3. 세션 생성 성공 시 UI 업데이트 및 추가정보 확인
    if (data.user) {
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
