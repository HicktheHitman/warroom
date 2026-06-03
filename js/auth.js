// js/auth.js
// ─────────────────────────────────────────────────────────
// WARROOM — Auth module
// Handles: sign in, sign up, Google OAuth, session storage, sign out
// All calls use XHR via Supabase REST auth endpoints.
// ─────────────────────────────────────────────────────────

const SESSION_KEY = 'warroom_session';

// ── Session helpers ──────────────────────────────────────

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const session = getSession();
  return session ? session.user : null;
}

function requireAuth() {
  const session = getSession();
  if (!session || !session.access_token) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// ── Sign In ──────────────────────────────────────────────

async function handleSignIn() {
  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const errEl    = document.getElementById('signin-error');
  const btn      = document.getElementById('btn-signin');

  errEl.classList.remove('visible');

  if (!email || !password) {
    showError(errEl, 'CALLSIGN/EMAIL AND AUTHORIZATION CODE REQUIRED');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'AUTHENTICATING...';

  const { data, error } = await xhrRequest('POST', `${AUTH_BASE}/token?grant_type=password`, {
    email,
    password
  });

  btn.disabled = false;
  btn.textContent = 'AUTHENTICATE';

  if (error || !data || !data.access_token) {
    const msg = (data && data.error_description) ? data.error_description.toUpperCase() : 'AUTHENTICATION FAILED';
    showError(errEl, msg);
    return;
  }

  saveSession(data);
  window.location.href = '/dashboard.html';
}

// ── Sign Up ──────────────────────────────────────────────

async function handleSignUp() {
  const callsign = document.getElementById('signup-callsign').value.trim().toUpperCase();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('signup-error');
  const btn      = document.getElementById('btn-signup');

  errEl.classList.remove('visible');

  // Validate callsign
  if (!callsign) {
    showError(errEl, 'CALLSIGN IS REQUIRED'); return;
  }
  if (!/^[A-Za-z0-9_\-]+$/.test(callsign)) {
    showError(errEl, 'CALLSIGN: LETTERS, NUMBERS, _ AND - ONLY'); return;
  }
  if (callsign.length < 3) {
    showError(errEl, 'CALLSIGN MUST BE AT LEAST 3 CHARACTERS'); return;
  }
  if (!email) {
    showError(errEl, 'EMAIL IS REQUIRED'); return;
  }
  if (!password || password.length < 8) {
    showError(errEl, 'AUTHORIZATION CODE MUST BE AT LEAST 8 CHARACTERS'); return;
  }

  btn.disabled = true;
  btn.textContent = 'REQUESTING CLEARANCE...';

  const { data, error } = await xhrRequest('POST', `${AUTH_BASE}/signup`, {
    email,
    password,
    data: { callsign }   // stored in raw_user_meta_data, used by the DB trigger
  });

  btn.disabled = false;
  btn.textContent = 'REQUEST CLEARANCE';

  if (error || !data || data.error) {
    const msg = (data && data.msg) ? data.msg.toUpperCase()
              : (data && data.error_description) ? data.error_description.toUpperCase()
              : 'SIGNUP FAILED — TRY AGAIN';
    showError(errEl, msg);
    return;
  }

  // Show confirmation message
  document.getElementById('form-signup').classList.add('hidden');
  document.getElementById('form-confirm').classList.remove('hidden');
}

// ── Google OAuth ─────────────────────────────────────────

function handleGoogleAuth() {
  const redirectTo = encodeURIComponent(window.location.origin + '/dashboard.html');
  const url = `${AUTH_BASE}/authorize?provider=google&redirect_to=${redirectTo}`;
  window.location.href = url;
}

// ── Sign Out ─────────────────────────────────────────────

async function handleSignOut() {
  const session = getSession();
  if (session && session.access_token) {
    // Call Supabase signout to invalidate the token server-side
    await xhrRequest('POST', `${AUTH_BASE}/logout`, null);
  }
  clearSession();
  window.location.href = '/index.html';
}

// ── OAuth Callback Handler ────────────────────────────────
// Call this on dashboard load to catch Google OAuth redirect tokens

function handleOAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.replace('#', '?'));
  const accessToken  = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn    = params.get('expires_in');

  if (accessToken) {
    const session = {
      access_token:  accessToken,
      refresh_token: refreshToken,
      expires_in:    parseInt(expiresIn, 10),
      user: null  // will be populated by fetchCurrentUser()
    };
    saveSession(session);
    // Clean the URL hash
    history.replaceState(null, '', window.location.pathname);
  }
}

// ── Fetch current user profile from DB ───────────────────

async function fetchCurrentUser() {
  const session = getSession();
  if (!session || !session.access_token) return null;

  const { data, error } = await xhrGet('profiles', 'select=*&limit=1', {
    'Authorization': `Bearer ${session.access_token}`
  });

  if (error || !data || !data.length) return null;
  return data[0];
}

// ── UI helpers ───────────────────────────────────────────

function showError(el, msg) {
  el.textContent = msg;
  el.classList.add('visible');
}

// ── Toast notifications ──────────────────────────────────

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
