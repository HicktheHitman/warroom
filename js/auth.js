// js/auth.js
// ─────────────────────────────────────────────────────────
// WARROOM — Auth module (Step 2 — fully wired)
// ─────────────────────────────────────────────────────────

const SESSION_KEY = 'warroom_session';
const PROFILE_KEY = 'warroom_profile';

// ── Session helpers ──────────────────────────────────────

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

function getCachedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function requireAuth() {
  const session = getSession();
  if (!session || !session.access_token) {
    window.location.href = '/index.html';
    return false;
  }
  // Give a 5 minute buffer — don't boot immediately on expiry
  // Supabase refresh tokens last 7 days by default
  if (session.expires_at && Date.now() / 1000 > session.expires_at + 300) {
    // Try to refresh silently before booting
    refreshSession().then(ok => {
      if (!ok) { clearSession(); window.location.href = '/index.html'; }
    });
  }
  return true;
}

async function refreshSession() {
  const session = getSession();
  if (!session || !session.refresh_token) return false;
  try {
    const res = await fetch(`${AUTH_BASE}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': WARROOM_CONFIG.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.access_token) return false;
    data.expires_at = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
    saveSession(data);
    return true;
  } catch (e) { return false; }
}

// ── Sign In ──────────────────────────────────────────────

async function handleSignIn() {
  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const errEl    = document.getElementById('signin-error');
  const btn      = document.getElementById('btn-signin');

  errEl.classList.remove('visible');
  if (!email || !password) {
    showAuthError(errEl, 'EMAIL AND AUTHORIZATION CODE REQUIRED');
    return;
  }

  setButtonLoading(btn, 'AUTHENTICATING...');

  const { data, error } = await xhrRequest('POST',
    `${AUTH_BASE}/token?grant_type=password`, { email, password });

  resetButton(btn, 'AUTHENTICATE');

  if (error || !data || !data.access_token) {
    const msg = (data && data.error_description)
      ? data.error_description.toUpperCase()
      : 'AUTHENTICATION FAILED — CHECK YOUR CREDENTIALS';
    showAuthError(errEl, msg);
    return;
  }

  // Store expiry timestamp
  data.expires_at = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
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

  // Validate
  if (!callsign) { showAuthError(errEl, 'CALLSIGN IS REQUIRED'); return; }
  if (!/^[A-Za-z0-9_\-]+$/.test(callsign)) {
    showAuthError(errEl, 'CALLSIGN: LETTERS, NUMBERS, _ AND - ONLY'); return;
  }
  if (callsign.length < 3) {
    showAuthError(errEl, 'CALLSIGN MUST BE AT LEAST 3 CHARACTERS'); return;
  }
  if (callsign.length > 24) {
    showAuthError(errEl, 'CALLSIGN MUST BE 24 CHARACTERS OR LESS'); return;
  }
  if (!email) { showAuthError(errEl, 'EMAIL IS REQUIRED'); return; }
  if (!password || password.length < 8) {
    showAuthError(errEl, 'AUTHORIZATION CODE MUST BE AT LEAST 8 CHARACTERS'); return;
  }

  setButtonLoading(btn, 'REQUESTING CLEARANCE...');

  // Check callsign availability first
  const { data: existing } = await xhrGet(
    'profiles', `select=id&callsign=eq.${encodeURIComponent(callsign)}`
  );
  if (existing && existing.length > 0) {
    resetButton(btn, 'REQUEST CLEARANCE');
    showAuthError(errEl, `CALLSIGN "${callsign}" IS ALREADY TAKEN`);
    return;
  }

  const { data, error } = await xhrRequest('POST', `${AUTH_BASE}/signup`, {
    email,
    password,
    data: { callsign }
  });

  resetButton(btn, 'REQUEST CLEARANCE');

  if (error || !data || data.error) {
    const msg = (data && data.msg) ? data.msg.toUpperCase()
              : (data && data.error_description) ? data.error_description.toUpperCase()
              : 'SIGNUP FAILED — TRY AGAIN';
    showAuthError(errEl, msg);
    return;
  }

  // Show confirmation screen
  showForm('confirm');
}

// ── Google OAuth ─────────────────────────────────────────

function handleGoogleAuth() {
  const redirectTo = encodeURIComponent(window.location.origin + '/dashboard.html');
  window.location.href = `${AUTH_BASE}/authorize?provider=google&redirect_to=${redirectTo}`;
}

// ── Sign Out ─────────────────────────────────────────────

async function handleSignOut() {
  const session = getSession();
  if (session && session.access_token) {
    await xhrRequest('POST', `${AUTH_BASE}/logout`, null);
  }
  clearSession();
  window.location.href = '/index.html';
}

// ── OAuth callback — captures token from URL hash ────────

function handleOAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.replace('#', '?'));
  const accessToken  = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn    = parseInt(params.get('expires_in') || '3600', 10);

  if (accessToken) {
    saveSession({
      access_token:  accessToken,
      refresh_token: refreshToken,
      expires_in:    expiresIn,
      expires_at:    Math.floor(Date.now() / 1000) + expiresIn
    });
    history.replaceState(null, '', window.location.pathname);
  }
}

// ── Fetch profile from DB (with cache) ───────────────────

async function fetchCurrentUser() {
  const session = getSession();
  if (!session || !session.access_token) return null;

  const cached = getCachedProfile();
  if (cached) return cached;

  try {
    const res = await fetch(
      `${API_BASE}/profiles?select=*&limit=1`,
      {
        headers: {
          'apikey': WARROOM_CONFIG.supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();

    // Profile exists — cache and return it
    if (data && data.length) {
      saveProfile(data[0]);
      return data[0];
    }

    // No profile found — create one automatically (catches Google OAuth fallthrough)
    const userRes = await fetch(`${AUTH_BASE}/user`, {
      headers: {
        'apikey': WARROOM_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    if (!userRes.ok) return null;
    const userData = await userRes.json();
    if (!userData || !userData.id) return null;

    // Count existing profiles to assign next OPERATIVE number
    const countRes = await fetch(`${API_BASE}/profiles?select=id`, {
      headers: {
        'apikey': WARROOM_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    const countData = countRes.ok ? await countRes.json() : [];
    const count = countData.length || 0;
    const callsign = 'OPERATIVE_' + String(count + 1).padStart(2, '0');

    // Insert the missing profile
    await fetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: {
        'apikey': WARROOM_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: userData.id,
        callsign,
        role: 'operative',
        created_at: new Date().toISOString()
      })
    });

    // Fetch and cache the newly created profile
    const newRes = await fetch(`${API_BASE}/profiles?select=*&limit=1`, {
      headers: {
        'apikey': WARROOM_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!newRes.ok) return null;
    const newData = await newRes.json();
    if (!newData || !newData.length) return null;
    saveProfile(newData[0]);
    return newData[0];

  } catch (e) {
    return null;
  }
}

// Bust the profile cache (call after profile updates)
function invalidateProfileCache() {
  localStorage.removeItem(PROFILE_KEY);
}

// ── Update callsign ──────────────────────────────────────

async function updateCallsign(newCallsign) {
  const session = getSession();
  if (!session) return { error: 'NOT AUTHENTICATED' };

  newCallsign = newCallsign.trim().toUpperCase();
  if (!/^[A-Za-z0-9_\-]+$/.test(newCallsign) || newCallsign.length < 3) {
    return { error: 'INVALID CALLSIGN FORMAT' };
  }

  // Check availability
  const { data: existing } = await xhrGet(
    'profiles', `select=id&callsign=eq.${encodeURIComponent(newCallsign)}`
  );
  if (existing && existing.length > 0) {
    return { error: `CALLSIGN "${newCallsign}" IS ALREADY TAKEN` };
  }

  const profile = getCachedProfile();
  if (!profile) return { error: 'PROFILE NOT LOADED' };

  const { data, error } = await xhrPatch(
    'profiles',
    `id=eq.${profile.id}`,
    { callsign: newCallsign }
  );

  if (error) return { error };
  invalidateProfileCache();
  return { data };
}

// ── UI helpers ───────────────────────────────────────────

function showAuthError(el, msg) {
  el.textContent = msg;
  el.classList.add('visible');
}

function setButtonLoading(btn, text) {
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = text;
}

function resetButton(btn, text) {
  btn.disabled = false;
  btn.textContent = text || btn.dataset.originalText || 'SUBMIT';
}

function showForm(name) {
  ['signin', 'signup', 'confirm'].forEach(f => {
    const el = document.getElementById('form-' + f);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById('form-' + name);
  if (target) target.classList.remove('hidden');
}

// ── Toast ────────────────────────────────────────────────

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
  }, 3500);
}
