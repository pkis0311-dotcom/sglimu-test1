// auth.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================================
// 🚨 Supabase Configuration (Sync with admin.js)
// ==========================================
const SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

// 세션 영속성 설정을 위해 옵션 추가
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

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
    if (!authOverlay) return;
    authOverlay.style.display = 'flex';
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
if (authOverlay) authOverlay.addEventListener('click', (e) => { if (e.target === authOverlay) closeAuthModal(); });

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
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: {
                prompt: 'none'
            }
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

        const { error } = await supabase.from('profiles').update({
            phone: phone,
            organization: org,
            address: address,
            user_type: userType
        }).eq('id', user.id);

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
            setTimeout(() => {
                closeAuthModal();
                window.location.reload();
            }, 1000);
        }
    });
}

// ==========================================
// 4. UI State Management
// ==========================================

async function checkProfileCompletion(user) {
    if (!user) return;
    
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
        openAuthModal('completeProfilePane');
    } else {
        console.log('Profile complete.');
    }
}

function updateAuthUI(user) {
    if (!userAuthWrap) {
        console.warn('userAuthWrap element not found!');
        return;
    }

    if (user) {
        console.log('Updating UI for logged-in user:', user.email);
        const userName = user.user_metadata.full_name || user.email.split('@')[0];
        userAuthWrap.innerHTML = `
            <div class="user-profile-nav">
                <span class="user-name"><b>${userName}</b> 님</span>
                <button class="logout-btn" id="logoutBtn">로그아웃</button>
            </div>
        `;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });
        }
        
        checkProfileCompletion(user);
    } else {
        console.log('Updating UI for guest user.');
        userAuthWrap.innerHTML = `
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
