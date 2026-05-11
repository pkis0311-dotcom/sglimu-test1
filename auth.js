import { supabase } from './supabase-client.js';

// ==========================================
// 📱 Kakao SDK Initialization
// ==========================================
const KAKAO_JS_KEY = 'afd6cc8f3b753cd6907f9eeadeac2342'; 
if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
    Kakao.init(KAKAO_JS_KEY);
    console.log('Kakao SDK Initialized:', Kakao.isInitialized());
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
if (naverLoginBtn) naverLoginBtn.addEventListener('click', () => signInWithSocial('naver'));
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
        if (!user) return;

        const profileData = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '유저',
            // email 컬럼이 테이블에 없을 경우를 대비해 제외
            phone: phone,
            organization: org,
            address: address,
            user_type: userType,
            updated_at: new Date().toISOString()
        };

        // update 대신 upsert를 사용하여 데이터가 없을 경우 생성하도록 수정
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
});
