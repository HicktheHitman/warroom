// js/serverstatus.js
// WARROOM — Server Status

const SS_PLATFORMS = ['PC', 'XBOX', 'PLAYSTATION'];
const SS_SERVICES  = ['MATCHMAKING', 'LOGIN', 'STORE'];

const SS_COLORS = {
  online:   { dot: '#7aad3f', text: '#7aad3f', label: 'ONLINE'   },
  degraded: { dot: '#c9a84c', text: '#c9a84c', label: 'DEGRADED' },
  offline:  { dot: '#c94040', text: '#c94040', label: 'OFFLINE'  },
};

let _ssData  = [];
let _ssTimer = null;

async function loadServerStatusPage() {
  const container = document.getElementById('serverstatus-content');
  if (_ssTimer) { clearInterval(_ssTimer); _ssTimer = null; }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    letter-spacing:2px;margin-bottom:4px;">NETWORK DIVISION</div>
        <div style="font-family:var(--font-mil);font-size:20px;letter-spacing:3px;
                    color:var(--bone);">SERVER STATUS</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="dot dot-olive blink"></span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--olive-glow);
                     letter-spacing:1px;">LIVE</span>
        <span style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);"
              id="ss-last-updated"></span>
      </div>
    </div>
    <div id="ss-main">
      <div style="text-align:center;padding:2rem;"><span class="spinner"></span></div>
    </div>`;

  await fetchServerStatus();
  _ssTimer = setInterval(silentRefreshStatus, 30000);
}

async function fetchServerStatus() {
  const { data, error } = await xhrGet('server_status', 'select=*');
  const main = document.getElementById('ss-main');
  if (!main) return;

  if (error) {
    main.innerHTML = `<div class="card"><div style="font-family:var(--font-mono);font-size:10px;
      color:var(--bone-dim);padding:1rem;text-align:center;">
      FAILED TO REACH STATUS SERVERS</div></div>`;
    return;
  }

  _ssData = data || [];
  ssUpdateTimestamp();
  renderStatusGrid();
}

function renderStatusGrid() {
  const main = document.getElementById('ss-main');
  if (!main) return;

  // Build lookup map
  const map = {};
  _ssData.forEach(r => { map[`${r.platform}|${r.service}`] = r; });

  // Overall status
  const allStatuses = _ssData.map(r => r.status);
  const overall = allStatuses.includes('offline')  ? 'offline'
                : allStatuses.includes('degraded') ? 'degraded'
                : 'online';

  const ovColor  = SS_COLORS[overall];
  const ovBanner = overall === 'online'
    ? { bg: '#0d1f0d', border: '#7aad3f', text: '#7aad3f', msg: 'ALL SYSTEMS OPERATIONAL' }
    : overall === 'degraded'
    ? { bg: '#1f1a0d', border: '#c9a84c', text: '#c9a84c', msg: 'DEGRADED PERFORMANCE DETECTED' }
    : { bg: '#1f0d0d', border: '#c94040', text: '#c94040', msg: 'OUTAGE DETECTED' };

  // Incident messages
  const incidents = _ssData.filter(r => r.status !== 'online' && r.message);

  main.innerHTML = `
    <!-- Overall banner -->
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                background:${ovBanner.bg};border:1px solid ${ovBanner.border};
                margin-bottom:1rem;">
      <span style="width:10px;height:10px;border-radius:50%;background:${ovBanner.border};
                   display:inline-block;${overall!=='online'?'animation:blink 1s step-end infinite;':''}">
      </span>
      <span style="font-family:var(--font-mono);font-size:11px;letter-spacing:2px;
                   color:${ovBanner.text};">${ovBanner.msg}</span>
    </div>

    <!-- Status grid -->
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:400px;">
        <thead>
          <tr>
            <th style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                       letter-spacing:2px;text-align:left;padding:6px 10px;
                       border-bottom:1px solid var(--navy-border);font-weight:normal;">
              PLATFORM
            </th>
            ${SS_SERVICES.map(svc => `
            <th style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                       letter-spacing:2px;text-align:center;padding:6px 10px;
                       border-bottom:1px solid var(--navy-border);font-weight:normal;">
              ${svc}
            </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${SS_PLATFORMS.map(platform => `
          <tr style="border-bottom:1px solid var(--navy-border-dim);">
            <td style="font-family:var(--font-mono);font-size:10px;color:var(--bone);
                       letter-spacing:1px;padding:10px 10px;">
              ${platform === 'PLAYSTATION' ? 'PS5' : platform}
            </td>
            ${SS_SERVICES.map(svc => {
              const row    = map[`${platform}|${svc}`];
              const status = row ? row.status : 'online';
              const c      = SS_COLORS[status];
              return `
              <td style="text-align:center;padding:10px;">
                <div style="display:inline-flex;align-items:center;gap:5px;">
                  <span style="width:8px;height:8px;border-radius:50%;
                               background:${c.dot};display:inline-block;flex-shrink:0;"></span>
                  <span style="font-family:var(--font-mono);font-size:9px;
                               color:${c.text};letter-spacing:1px;">${c.label}</span>
                </div>
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Incidents -->
    ${incidents.length ? `
    <div style="margin-top:1rem;">
      <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                  letter-spacing:2px;margin-bottom:6px;">ACTIVE INCIDENTS</div>
      ${incidents.map(r => `
        <div style="display:flex;gap:10px;padding:8px 12px;margin-bottom:4px;
                    border-left:2px solid ${SS_COLORS[r.status].dot};
                    background:var(--navy-card);">
          <span style="font-family:var(--font-mono);font-size:9px;
                       color:${SS_COLORS[r.status].text};letter-spacing:1px;
                       white-space:nowrap;">
            ${r.platform === 'PLAYSTATION' ? 'PS5' : r.platform} // ${r.service}
          </span>
          <span style="font-family:var(--font-body);font-size:12px;color:var(--bone-muted);">
            ${ssEsc(r.message)}
          </span>
        </div>`).join('')}
    </div>` : ''}

    <!-- Updated by -->
    ${_ssData.length && _ssData[0].updated_at ? `
    <div style="margin-top:1rem;font-family:var(--font-mono);font-size:8px;
                color:var(--bone-dim);letter-spacing:1px;text-align:right;">
      LAST UPDATED BY COMMAND: ${new Date(
        _ssData.slice().sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at))[0].updated_at
      ).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).toUpperCase()}
    </div>` : ''}`;
}

async function silentRefreshStatus() {
  if (currentPage !== 'serverstatus') return;
  const { data, error } = await xhrGet('server_status', 'select=*');
  if (error || !data) return;
  _ssData = data;
  ssUpdateTimestamp();
  renderStatusGrid();
}

function ssUpdateTimestamp() {
  const el = document.getElementById('ss-last-updated');
  if (el) {
    el.textContent = 'SYNC ' + new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }
}

function ssEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
