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
    // Preserve user object — refresh response may omit it
    if (!data.user && session.user) data.user = session.user;
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
  window.location.href = `${AUTH_BASE}/authorize?provider=google&redirect_to=${redirectTo}&flow_type=implicit`;
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

async function handleOAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.replace('#', '?'));
  const accessToken  = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn    = parseInt(params.get('expires_in') || '3600', 10);

  if (accessToken) {
    // Fetch user info to store user ID in session
    try {
      const userRes = await fetch(`${AUTH_BASE}/user`, {
        headers: {
          'apikey': WARROOM_CONFIG.supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const userData = await userRes.json();
      saveSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_in:    expiresIn,
        expires_at:    Math.floor(Date.now() / 1000) + expiresIn,
        user: { id: userData.id }
      });
    } catch (e) {
      saveSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_in:    expiresIn,
        expires_at:    Math.floor(Date.now() / 1000) + expiresIn
      });
    }

    // Clear cached profile so fresh one loads for this user
    localStorage.removeItem('warroom_profile');
    history.replaceState(null, '', window.location.pathname);
  }
}

// ── Fetch profile from DB (with cache) ───────────────────

async function fetchCurrentUser() {
  const session = getSession();
  if (!session || !session.access_token) return null;

  // Resolve user ID — prefer session cache, fall back to /user endpoint
  let userId = session.user?.id;
  if (!userId) {
    try {
      const userRes = await fetch(`${AUTH_BASE}/user`, {
        headers: {
          'apikey': WARROOM_CONFIG.supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userId = userData.id;
        if (userId) saveSession({ ...session, user: { id: userId } });
      }
    } catch (e) {}
  }

  if (!userId) return null;

  // Return cache only when it verifiably belongs to this user
  const cached = getCachedProfile();
  if (cached) {
    if (cached.id === userId) return cached;
    localStorage.removeItem(PROFILE_KEY);
  }

  try {
    const res = await fetch(
      `${API_BASE}/profiles?select=*&id=eq.${userId}&limit=1`,
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
    // Count existing profiles to assign next OPERATIVE number
    // Use callsign from user_metadata (email signup) if available
    const metaCallsign = session.user?.user_metadata?.callsign;
    let callsign;
    if (metaCallsign && /^[A-Za-z0-9_\-]{3,24}$/.test(metaCallsign)) {
      callsign = metaCallsign.toUpperCase();
    } else {
      // Use first 6 chars of user UUID — unique per user, no count query needed
      callsign = 'OPERATIVE_' + userId.replace(/-/g, '').slice(0, 6).toUpperCase();
    }

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
        id: userId,
        callsign,
        role: 'operative',
        created_at: new Date().toISOString()
      })
    });

    // Fetch and cache the newly created profile
    const newRes = await fetch(`${API_BASE}/profiles?select=*&id=eq.${userId}&limit=1`, {
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

// ── First-login callsign setup ────────────────────────────

async function checkCallsignSetup() {
  const profile = await fetchCurrentUser();

  // Show prompt if no profile at all, or if assigned a temporary OPERATIVE_ callsign
  if (profile && !profile.callsign.startsWith('OPERATIVE_')) return;

  // Build full-screen overlay
  const overlay = document.createElement('div');
  overlay.id = 'callsign-setup-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:var(--navy-deep);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font-mono);`;

  overlay.innerHTML = `
    <div style="width:100%;max-width:480px;padding:2rem;border:1px solid var(--gold-dim);
                background:var(--navy);margin:1rem;">
      <div style="font-size:9px;color:var(--gold);letter-spacing:3px;
                  margin-bottom:0.5rem;">// WARROOM SECURITY PROTOCOL</div>
      <div style="font-family:var(--font-mil);font-size:24px;color:var(--bone);
                  letter-spacing:2px;margin-bottom:0.5rem;">CALLSIGN REQUIRED</div>
      <div style="font-size:10px;color:var(--bone-dim);letter-spacing:1px;
                  line-height:1.6;margin-bottom:1.5rem;border-top:1px solid var(--navy-border);
                  padding-top:1rem;">
        OPERATIVE — YOU HAVE BEEN GRANTED CLEARANCE BUT HAVE NOT BEEN ASSIGNED A CALLSIGN.<br><br>
        DESIGNATE YOUR CALLSIGN BEFORE ACCESSING WARROOM INTEL.
      </div>

      <div style="margin-bottom:1rem;">
        <label style="font-size:9px;color:var(--bone-dim);letter-spacing:2px;
                      display:block;margin-bottom:6px;">CALLSIGN DESIGNATION</label>
        <input id="callsign-input" class="mil-input" type="text"
               maxlength="24" placeholder="ENTER YOUR CALLSIGN"
               style="width:100%;box-sizing:border-box;text-transform:uppercase;"
               oninput="this.value=this.value.toUpperCase()">
        <div id="callsign-rules" style="font-size:9px;color:var(--bone-dim);
                      margin-top:4px;letter-spacing:0.5px;">
          LETTERS, NUMBERS, _ AND - ONLY. 3–24 CHARACTERS.
        </div>
        <div id="callsign-error" style="font-size:9px;color:var(--red);
                      margin-top:4px;letter-spacing:0.5px;display:none;"></div>
      </div>

      <button id="btn-confirm-callsign" class="btn btn-primary"
              style="width:100%;padding:12px;font-size:10px;letter-spacing:2px;"
              onclick="confirmCallsign()">
        CONFIRM DESIGNATION
      </button>
    </div>`;

  document.body.appendChild(overlay);

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('callsign-input');
    if (input) input.focus();
  }, 100);
}

async function confirmCallsign() {
  const input  = document.getElementById('callsign-input');
  const errEl  = document.getElementById('callsign-error');
  const btn    = document.getElementById('btn-confirm-callsign');
  const callsign = (input.value || '').trim().toUpperCase();

  errEl.style.display = 'none';

  // Validate
  if (!callsign || callsign.length < 3) {
    errEl.textContent = 'CALLSIGN MUST BE AT LEAST 3 CHARACTERS';
    errEl.style.display = 'block'; return;
  }
  if (callsign.length > 24) {
    errEl.textContent = 'CALLSIGN MUST BE 24 CHARACTERS OR LESS';
    errEl.style.display = 'block'; return;
  }
  if (!/^[A-Za-z0-9_\-]+$/.test(callsign)) {
    errEl.textContent = 'LETTERS, NUMBERS, _ AND - ONLY';
    errEl.style.display = 'block'; return;
  }
  if (callsign.startsWith('OPERATIVE_')) {
    errEl.textContent = 'CHOOSE A UNIQUE CALLSIGN — NOT AN OPERATIVE CODE';
    errEl.style.display = 'block'; return;
  }

  setButtonLoading(btn, 'VERIFYING...');

  // Check availability
  const { data: existing } = await xhrGet(
    'profiles', `select=id&callsign=eq.${encodeURIComponent(callsign)}`
  );
  if (existing && existing.length > 0) {
    resetButton(btn, 'CONFIRM DESIGNATION');
    errEl.textContent = `CALLSIGN "${callsign}" IS ALREADY TAKEN`;
    errEl.style.display = 'block'; return;
  }

    // Save it — create profile if it doesn't exist yet
  const profile = getCachedProfile();
  let error;
  if (profile) {
    const result = await updateCallsign(callsign);
    error = result.error;
  } else {
    const session = getSession();
    const userRes = await fetch(`${AUTH_BASE}/user`, {
      headers: {
        'apikey': WARROOM_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    const userData = await userRes.json();
    const { error: insertError } = await xhrPost('profiles', {
      id: userData.id,
      callsign,
      role: 'operative',
      created_at: new Date().toISOString()
    });
    error = insertError;
  }
  if (error) {
    resetButton(btn, 'CONFIRM DESIGNATION');
    errEl.textContent = 'FAILED TO SAVE: ' + error;
    errEl.style.display = 'block'; return;
  }

  // Remove overlay and update topbar
  const overlay = document.getElementById('callsign-setup-overlay');
  if (overlay) overlay.remove();
  invalidateProfileCache();

  const topbarEl = document.getElementById('topbar-callsign');
  if (topbarEl) topbarEl.textContent = callsign;
  if (typeof currentUser !== 'undefined' && currentUser) currentUser.callsign = callsign;

  showToast('CALLSIGN CONFIRMED — WELCOME TO WARROOM', 'success');
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
