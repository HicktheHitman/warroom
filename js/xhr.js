// js/xhr.js
// ─────────────────────────────────────────────────────────
// WARROOM — XHR helper
// All Supabase REST calls go through xhrRequest().
// Never use fetch() or the Supabase JS client — XHR only.
// ─────────────────────────────────────────────────────────

/**
 * Core XHR wrapper.
 * @param {string} method   - GET | POST | PATCH | DELETE
 * @param {string} url      - Full URL (use API_BASE + '/table?...')
 * @param {object|null} body - JSON payload (POST/PATCH) or null
 * @param {object} extraHeaders - Any additional headers
 * @returns {Promise<{data: any, error: string|null, status: number}>}
 */
function xhrRequest(method, url, body = null, extraHeaders = {}) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    // Standard Supabase REST headers
    xhr.setRequestHeader('apikey', WARROOM_CONFIG.supabaseAnonKey);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Prefer', 'return=representation');

    // Auth token if user is logged in
    const session = getSession();
    if (session && session.access_token) {
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    }

    // Any extra headers (e.g. Range for pagination)
    Object.entries(extraHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.onload = function () {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = xhr.responseText; }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data, error: null, status: xhr.status });
      } else {
        const msg = (data && data.message) ? data.message : `HTTP ${xhr.status}`;
        resolve({ data: null, error: msg, status: xhr.status });
      }
    };

    xhr.onerror = function () {
      resolve({ data: null, error: 'Network error', status: 0 });
    };

    xhr.send(body ? JSON.stringify(body) : null);
  });
}

// ─── Shorthand helpers ────────────────────────────────────

function xhrGet(table, queryString = '', extraHeaders = {}) {
  return xhrRequest('GET', `${API_BASE}/${table}?${queryString}`, null, extraHeaders);
}

function xhrPost(table, body) {
  return xhrRequest('POST', `${API_BASE}/${table}`, body);
}

function xhrPatch(table, queryString, body) {
  return xhrRequest('PATCH', `${API_BASE}/${table}?${queryString}`, body);
}

function xhrDelete(table, queryString) {
  return xhrRequest('DELETE', `${API_BASE}/${table}?${queryString}`, null);
}

// ─── RPC calls (Postgres functions) ──────────────────────

function xhrRpc(fnName, params = {}) {
  return xhrRequest('POST', `${API_BASE}/rpc/${fnName}`, params);
}
