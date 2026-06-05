// js/feed.js
// ─────────────────────────────────────────────────────────
// WARROOM — Field Reports social feed (Step 6)
// Post text + embed YouTube/TikTok/Twitter links
// ─────────────────────────────────────────────────────────

async function loadReportsPage() {
  const container = document.getElementById('reports-content');

  container.innerHTML = `
    <div id="reports-list">
      <div style="text-align:center;padding:2rem 0;"><span class="spinner"></span></div>
    </div>
    <div id="report-modal-overlay" class="modal-overlay hidden"
         onclick="closeReportModal(event)"></div>`;

  // File a report button — fixed at top
  const profile = getCachedProfile();
  document.getElementById('reports-list').insertAdjacentHTML('beforebegin', `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                  letter-spacing:2px;" id="reports-count"></div>
      ${profile
        ? `<button class="btn btn-primary" style="font-size:9px;padding:8px 14px;"
                   onclick="showFileReportModal()">+ FILE A REPORT</button>`
        : `<div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);">
             AUTHENTICATE TO POST</div>`}
    </div>`);

  await fetchReports();
}

async function fetchReports() {
  const { data, error } = await xhrGet(
    'field_reports_with_author',
    'select=*&order=pinned.desc.nullslast,created_at.desc&limit=50'
  );

  const container = document.getElementById('reports-list');
  const countEl   = document.getElementById('reports-count');

  if (error) {
    container.innerHTML = `<div class="card"><div style="font-family:var(--font-mono);
      font-size:10px;color:var(--bone-dim);padding:1rem;text-align:center;">
      FAILED TO LOAD FIELD REPORTS</div></div>`;
    return;
  }

  const reports = data || [];
  if (countEl) countEl.textContent = `${reports.length} REPORTS FILED`;

  if (!reports.length) {
    container.innerHTML = `
      <div class="card card-top-olive">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1.5rem;text-align:center;letter-spacing:1px;">
          NO FIELD REPORTS YET — BE THE FIRST TO FILE
        </div>
      </div>`;
    return;
  }

  container.innerHTML = reports.map(r => {
    const timeAgo = getTimeAgo(r.created_at);
    const roleBadge = r.role === 'admin' || r.role === 'command'
      ? `<span class="badge badge-command">COMMAND</span>`
      : `<span class="badge badge-operative">OPERATIVE</span>`;

    const embed = r.embed_url ? buildEmbed(r.embed_url, r.embed_type) : '';
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'command');
    const profile = getCachedProfile();
    const canDelete = isAdmin || (profile && profile.id === r.id);

    return `
      <div class="card" style="margin-bottom:0.75rem;${r.pinned ? 'border-top:2px solid var(--gold);' : ''}">
        ${r.pinned ? `<div style="font-family:var(--font-mono);font-size:8px;color:var(--gold);
          letter-spacing:2px;padding:4px 0;border-bottom:1px solid var(--navy-border);
          margin-bottom:8px;">📌 PINNED BY COMMAND</div>` : ''}
        <div style="display:flex;align-items:flex-start;gap:10px;">

          <!-- Avatar -->
          <div style="width:36px;height:36px;background:var(--navy-border);
                      border:1px solid var(--navy-border);display:flex;align-items:center;
                      justify-content:center;font-family:var(--font-mil);font-size:13px;
                      color:var(--gold);flex-shrink:0;">
            ${escHtml(r.callsign || '?').charAt(0)}
          </div>

          <div style="flex:1;min-width:0;">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;
                        flex-wrap:wrap;">
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--gold);
                           letter-spacing:1px;">${escHtml(r.callsign || 'UNKNOWN')}</span>
              ${roleBadge}
              <span style="font-family:var(--font-mono);font-size:9px;
                           color:var(--bone-dim);">${timeAgo}</span>
            </div>

            <!-- Body -->
            <div style="font-family:var(--font-body);font-size:14px;color:var(--bone);
                        line-height:1.5;margin-bottom:${embed ? '8px' : '0'};">
              ${escHtml(r.body)}
            </div>

            <!-- Embed -->
            ${embed}

            <!-- Actions -->
            ${canDelete ? `
            <div style="margin-top:8px;display:flex;gap:6px;">
              ${isAdmin ? `<button class="btn btn-ghost" style="font-size:8px;padding:2px 6px;
                color:${r.pinned ? 'var(--gold)' : 'var(--bone-dim)'};"
                onclick="togglePin('${r.id}', ${r.pinned || false})">
                ${r.pinned ? '📌 PINNED' : 'PIN'}
              </button>` : ''}
              <button class="btn btn-ghost" style="font-size:8px;color:var(--red);padding:2px 6px;"
                      onclick="deleteReport('${r.id}')">DELETE</button>
            </div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Embed builder ─────────────────────────────────────────

function buildEmbed(url, type) {
  if (!url) return '';

  // Detect type from URL if not set
  if (!type) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
    else if (url.includes('tiktok.com')) type = 'tiktok';
    else if (url.includes('twitter.com') || url.includes('x.com')) type = 'twitter';
  }

  if (type === 'youtube') {
    const videoId = extractYoutubeId(url);
    if (!videoId) return `<a href="${escHtml(url)}" target="_blank" rel="noopener"
      style="font-family:var(--font-mono);font-size:10px;color:var(--gold);">
      VIEW SOURCE ↗</a>`;
    return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;
                        background:var(--navy);margin-top:8px;">
      <iframe src="https://www.youtube.com/embed/${videoId}"
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
              allowfullscreen loading="lazy"></iframe>
    </div>`;
  }

  if (type === 'tiktok' || type === 'twitter') {
    return `<a href="${escHtml(url)}" target="_blank" rel="noopener"
      style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;
             font-family:var(--font-mono);font-size:10px;color:var(--gold);
             border:1px solid var(--gold-dim);padding:4px 10px;
             background:var(--gold-bg);">
      ${type === 'tiktok' ? '▶ VIEW ON TIKTOK' : '▶ VIEW ON X'} ↗
    </a>`;
  }

  // Generic link
  return `<a href="${escHtml(url)}" target="_blank" rel="noopener"
    style="font-family:var(--font-mono);font-size:10px;color:var(--gold);">
    VIEW SOURCE ↗</a>`;
}

function extractYoutubeId(url) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── File a report modal ───────────────────────────────────

function showFileReportModal() {
  const overlay = document.getElementById('report-modal-overlay');

  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">FILE A FIELD REPORT</div>
      <div class="error-msg" id="report-submit-error"></div>

      <div class="field-group">
        <label class="field-label" for="report-body">REPORT</label>
        <textarea class="mil-input" id="report-body" rows="4" maxlength="1000"
                  placeholder="What's your intel? Thoughts on MW4, leaks you've seen, hype..."></textarea>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    margin-top:4px;text-align:right;" id="report-char-count">0 / 1000</div>
      </div>

      <div class="field-group">
        <label class="field-label" for="report-embed">EMBED LINK (OPTIONAL)</label>
        <input class="mil-input" type="url" id="report-embed"
               placeholder="YouTube, TikTok, or X/Twitter link">
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    margin-top:4px;letter-spacing:0.5px;">
          YOUTUBE LINKS EMBED INLINE — TIKTOK/X SHOW AS LINK
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeReportModal()">CANCEL</button>
        <button class="btn btn-primary" id="btn-submit-report"
                onclick="submitReport()">TRANSMIT REPORT</button>
      </div>
    </div>`;

  overlay.classList.remove('hidden');

  // Char counter
  const ta = document.getElementById('report-body');
  const cc = document.getElementById('report-char-count');
  ta.addEventListener('input', () => {
    cc.textContent = `${ta.value.length} / 1000`;
    cc.style.color = ta.value.length > 900 ? 'var(--red)' : 'var(--bone-dim)';
  });
}

function closeReportModal(event) {
  if (!event || event.target.id === 'report-modal-overlay') {
    document.getElementById('report-modal-overlay').classList.add('hidden');
  }
}

async function submitReport() {
  const body     = document.getElementById('report-body').value.trim();
  const embedUrl = document.getElementById('report-embed').value.trim();
  const errEl    = document.getElementById('report-submit-error');
  const btn      = document.getElementById('btn-submit-report');
  const profile  = getCachedProfile();

  errEl.classList.remove('visible');

  if (!body) {
    errEl.textContent = 'REPORT BODY IS REQUIRED';
    errEl.classList.add('visible');
    return;
  }
  if (body.length > 1000) {
    errEl.textContent = 'REPORT MUST BE 1000 CHARACTERS OR LESS';
    errEl.classList.add('visible');
    return;
  }
  if (!profile) {
    errEl.textContent = 'YOU MUST BE AUTHENTICATED';
    errEl.classList.add('visible');
    return;
  }

  // Detect embed type
  let embedType = null;
  if (embedUrl) {
    if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) embedType = 'youtube';
    else if (embedUrl.includes('tiktok.com')) embedType = 'tiktok';
    else if (embedUrl.includes('twitter.com') || embedUrl.includes('x.com')) embedType = 'twitter';
  }

  setButtonLoading(btn, 'TRANSMITTING...');

  const { error } = await xhrPost('field_reports', {
    user_id:    profile.id,
    body,
    embed_url:  embedUrl  || null,
    embed_type: embedType || null
  });

  resetButton(btn, 'TRANSMIT REPORT');

  if (error) {
    errEl.textContent = 'FAILED TO POST: ' + error;
    errEl.classList.add('visible');
    return;
  }

  closeReportModal();
  showToast('FIELD REPORT FILED', 'success');
  await fetchReports();
}

async function togglePin(id, currentlyPinned) {
  const { error } = await xhrPatch('field_reports', `id=eq.${id}`, {
    pinned: !currentlyPinned
  });
  if (error) { showToast('PIN FAILED', 'error'); return; }
  showToast(currentlyPinned ? 'POST UNPINNED' : 'POST PINNED', 'success');
  await fetchReports();
}

async function deleteReport(id) {
  if (!confirm('DELETE THIS FIELD REPORT?')) return;
  const { error } = await xhrDelete('field_reports', `id=eq.${id}`);
  if (error) { showToast('DELETE FAILED', 'error'); return; }
  showToast('REPORT DELETED', 'default');
  await fetchReports();
}

// ── Helpers ───────────────────────────────────────────────

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'JUST NOW';
  if (mins < 60)  return `${mins}M AGO`;
  if (hours < 24) return `${hours}HR AGO`;
  return `${days}D AGO`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
