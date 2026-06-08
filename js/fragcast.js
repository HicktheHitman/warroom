// js/fragcast.js
// ─────────────────────────────────────────────────────────
// WARROOM — FragCast episode feed (Step 7)
// Admin manages episodes, community listens in-app
// ─────────────────────────────────────────────────────────

async function loadFragcastPage() {
  const container = document.getElementById('fragcast-content');

  container.innerHTML = `
    <div class="grid-2-1" style="align-items:start;gap:1rem;">
      <div id="fragcast-episodes">
        <div style="text-align:center;padding:2rem 0;">
          <span class="spinner"></span>
        </div>
      </div>
      <div id="fragcast-sidebar"></div>
    </div>`;

  await fetchEpisodes();
}

async function fetchEpisodes() {
  const { data, error } = await xhrGet(
    'fragcast_episodes',
    'select=*&order=episode_num.desc'
  );

  renderEpisodes(data || []);
  renderFragcastSidebar();
}

function renderEpisodes(episodes) {
  ${isAdmin ? `
  <button class="btn btn-ghost" style="font-size:8px;padding:2px 8px;"
    onclick="showAddEpisodeModal()">+ ADD</button>
  <button id="btn-rss-sync" class="btn btn-ghost" style="font-size:8px;padding:2px 8px;color:var(--olive-glow);"
    onclick="syncFromRSS()">SYNC RSS</button>` : ''}

  if (!episodes.length) {
    container.innerHTML = `
      <div class="card card-top">
        <div class="card-header">
          <div class="card-title">FRAGCAST // WEEKLY INTEL</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--olive-glow);">
            NEW EPISODES WEEKLY
          </div>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1.5rem 0;text-align:center;letter-spacing:1px;">
          NO EPISODES POSTED YET
          ${isAdmin ? `<br><br><button class="btn btn-secondary" style="font-size:9px;"
            onclick="showAddEpisodeModal()">+ ADD EPISODE</button>` : ''}
        </div>
      </div>`;
    return;
  }

  // Latest episode gets featured treatment
  const latest   = episodes[0];
  const rest      = episodes.slice(1);

  container.innerHTML = `
    <div class="card card-top" style="margin-bottom:1rem;">
      <div class="card-header">
        <div class="card-title">FRAGCAST // WEEKLY INTEL</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="dot dot-olive blink"></div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--olive-glow);">
            NEW EPISODES WEEKLY
          </div>
          ${isAdmin ? `<button class="btn btn-ghost" style="font-size:8px;padding:2px 8px;"
            onclick="showAddEpisodeModal()">+ ADD</button>` : ''}
        </div>
      </div>

      <!-- Latest episode featured -->
      <div style="background:var(--navy);border:1px solid var(--gold-dim);
                  padding:1rem;margin-bottom:1rem;">
        <div style="font-family:var(--font-mono);font-size:8px;color:var(--gold);
                    letter-spacing:2px;margin-bottom:8px;">LATEST EPISODE</div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-family:var(--font-mil);font-size:36px;font-weight:900;
                      color:var(--gold-dark);line-height:1;flex-shrink:0;min-width:48px;">
            ${latest.episode_num}
          </div>
          <div style="flex:1;">
            <div style="font-family:var(--font-body);font-size:16px;font-weight:600;
                        color:var(--bone);line-height:1.3;margin-bottom:4px;">
              ${escHtml(latest.title)}
            </div>
            ${latest.description ? `
            <div style="font-family:var(--font-body);font-size:12px;color:var(--bone-muted);
                        line-height:1.5;margin-bottom:8px;">
              ${escHtml(latest.description)}
            </div>` : ''}
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);">
                HICKTHEHITMAN × ZANGETSU
              </span>
              ${latest.duration ? `
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);">
                ${escHtml(latest.duration)}
              </span>` : ''}
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);">
                ${formatDate(latest.published_at)}
              </span>
            </div>
            ${latest.embed_url ? `
            <div style="margin-top:10px;">
              <a href="${escHtml(latest.embed_url)}" target="_blank" rel="noopener"
                 class="btn btn-primary" style="font-size:9px;padding:8px 16px;
                 display:inline-flex;align-items:center;gap:6px;">
                ▶ TUNE IN
              </a>
            </div>` : ''}
          </div>
        </div>
        ${isAdmin ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--navy-border);">
          <button class="btn btn-ghost" style="font-size:8px;color:var(--red);padding:2px 6px;"
                  onclick="deleteEpisode(${latest.id})">DELETE</button>
        </div>` : ''}
      </div>

      <!-- Previous episodes -->
      ${rest.length ? `
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                  letter-spacing:2px;margin-bottom:8px;padding-bottom:6px;
                  border-bottom:1px solid var(--navy-border);">PREVIOUS EPISODES</div>
      ${rest.map(ep => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;
                    border-bottom:1px solid var(--navy-border-dim);">
          <div style="font-family:var(--font-mil);font-size:20px;font-weight:900;
                      color:var(--navy-border);line-height:1;min-width:36px;flex-shrink:0;">
            ${ep.episode_num}
          </div>
          <div style="flex:1;">
            <div style="font-family:var(--font-body);font-size:13px;font-weight:600;
                        color:var(--bone);margin-bottom:2px;">${escHtml(ep.title)}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                        display:flex;gap:8px;flex-wrap:wrap;">
              ${ep.duration ? `<span>${escHtml(ep.duration)}</span>` : ''}
              <span>${formatDate(ep.published_at)}</span>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
            ${ep.embed_url ? `
            <a href="${escHtml(ep.embed_url)}" target="_blank" rel="noopener"
               class="btn btn-secondary" style="font-size:8px;padding:4px 10px;">
              ▶ TUNE IN
            </a>` : ''}
            ${isAdmin ? `
            <button class="btn btn-ghost" style="font-size:8px;color:var(--red);padding:4px 6px;"
                    onclick="deleteEpisode(${ep.id})">✕</button>` : ''}
          </div>
        </div>`).join('')}` : ''}
    </div>`;
}

function renderFragcastSidebar() {
  const sidebar = document.getElementById('fragcast-sidebar');
  sidebar.innerHTML = `
    <div class="card card-top-olive" style="margin-bottom:1rem;">
      <div class="card-header">
        <div class="card-title">ABOUT FRAGCAST</div>
      </div>
      <div style="font-family:var(--font-body);font-size:13px;color:var(--bone-muted);
                  line-height:1.6;margin-bottom:1rem;">
        Weekly CoD and Warzone intel podcast hosted by
        <span style="color:var(--bone);">HickTheHitman</span> and
        <span style="color:var(--bone);">Zangetsu</span>.
        New episodes drop every week.
      </div>
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                  letter-spacing:2px;margin-bottom:8px;">FIND US ON</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <a href="https://open.spotify.com/show/033oBK5NtVayQl7ZdG2kq6" target="_blank" rel="noopener" class="fragcast-platform-btn">
          <span>🎙</span> SPOTIFY
        </a>
        <a href="https://podcasts.apple.com/us/podcast/fragcast/id1896836000" target="_blank" rel="noopener" class="fragcast-platform-btn">
          <span>🎵</span> APPLE PODCASTS
        </a>
        <a href="#" class="fragcast-platform-btn" style="opacity:0.4;cursor:not-allowed;">
          <span>▶</span> YOUTUBE — COMING SOON
        </a>
      </div>
    </div>

    <div class="card" style="text-align:center;padding:1.25rem;">
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                  letter-spacing:2px;margin-bottom:8px;">COMMUNITY CTA</div>
      <div style="font-family:var(--font-mil);font-size:13px;color:var(--gold);
                  letter-spacing:2px;margin-bottom:8px;">DROP YOUR CALLSIGN</div>
      <div style="font-family:var(--font-body);font-size:12px;color:var(--bone-muted);
                  line-height:1.5;">
        Mention WARROOM on FragCast and get featured in Field Reports
      </div>
    </div>`;
}

// ── Add episode modal (admin only) ───────────────────────

function showAddEpisodeModal() {
  // Inject modal into page
  const existing = document.getElementById('fragcast-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'fragcast-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">ADD FRAGCAST EPISODE</div>
      <div class="error-msg" id="ep-error"></div>

      <div class="grid-2" style="margin-bottom:0;">
        <div class="field-group">
          <label class="field-label" for="ep-num">EPISODE NUMBER</label>
          <input class="mil-input" type="number" id="ep-num" placeholder="E.G. 12" min="1">
        </div>
        <div class="field-group">
          <label class="field-label" for="ep-duration">DURATION</label>
          <input class="mil-input" type="text" id="ep-duration" placeholder="E.G. 1H 14M">
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="ep-title">EPISODE TITLE</label>
        <input class="mil-input" type="text" id="ep-title"
               placeholder="E.G. MW4 LAUNCH ROSTER DEEP DIVE">
      </div>
      <div class="field-group">
        <label class="field-label" for="ep-desc">DESCRIPTION (OPTIONAL)</label>
        <textarea class="mil-input" id="ep-desc" rows="2"
                  placeholder="Brief episode summary..."></textarea>
      </div>
      <div class="field-group">
        <label class="field-label" for="ep-url">EPISODE LINK</label>
        <input class="mil-input" type="url" id="ep-url"
               placeholder="Spotify, Apple Podcasts, or YouTube link">
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary"
                onclick="document.getElementById('fragcast-modal-overlay').remove()">
          CANCEL
        </button>
        <button class="btn btn-primary" id="btn-add-ep" onclick="submitEpisode()">
          ADD EPISODE
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

async function submitEpisode() {
  const num     = parseInt(document.getElementById('ep-num').value, 10);
  const title   = document.getElementById('ep-title').value.trim();
  const desc    = document.getElementById('ep-desc').value.trim();
  const dur     = document.getElementById('ep-duration').value.trim();
  const url     = document.getElementById('ep-url').value.trim();
  const errEl   = document.getElementById('ep-error');
  const btn     = document.getElementById('btn-add-ep');

  errEl.classList.remove('visible');

  if (!num || !title) {
    errEl.textContent = 'EPISODE NUMBER AND TITLE REQUIRED';
    errEl.classList.add('visible');
    return;
  }

  setButtonLoading(btn, 'ADDING...');

  const { error } = await xhrPost('fragcast_episodes', {
    episode_num:  num,
    title,
    description:  desc || null,
    duration:     dur  || null,
    embed_url:    url  || null,
    published_at: new Date().toISOString()
  });

  resetButton(btn, 'ADD EPISODE');

  if (error) {
    errEl.textContent = 'FAILED: ' + error;
    errEl.classList.add('visible');
    return;
  }

  document.getElementById('fragcast-modal-overlay').remove();
  showToast('EPISODE ADDED', 'success');
  await fetchEpisodes();
}

async function deleteEpisode(id) {
  if (!confirm('DELETE THIS EPISODE?')) return;
  const { error } = await xhrDelete('fragcast_episodes', `id=eq.${id}`);
  if (error) { showToast('DELETE FAILED', 'error'); return; }
  showToast('EPISODE DELETED', 'default');
  await fetchEpisodes();
}

// ── RSS Sync (admin only) ─────────────────────────────────

async function syncFromRSS() {
  const btn = document.getElementById('btn-rss-sync');
  if (btn) { btn.disabled = true; btn.textContent = 'SYNCING...'; }

  try {
    const rssUrl = 'https://anchor.fm/s/1131b36cc/podcast/rss';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

    const res = await fetch(proxyUrl);
    const json = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(json.contents, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));

    if (!items.length) {
      showToast('NO EPISODES FOUND IN RSS', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'SYNC RSS'; }
      return;
    }

    // Get existing episode numbers to avoid duplicates
    const { data: existing } = await xhrGet('fragcast_episodes', 'select=episode_num');
    const existingNums = new Set((existing || []).map(e => e.episode_num));

    let newCount = 0;
    const totalItems = items.length;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.querySelector('title')?.textContent?.trim() || 'UNTITLED';
      const description = item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').trim() || null;
      const pubDate = item.querySelector('pubDate')?.textContent?.trim();
      const episodeNum = totalItems - i; // newest = highest number

      // Skip if already exists
      if (existingNums.has(episodeNum)) continue;

      // Get Spotify link from guid or link
      const guid = item.querySelector('guid')?.textContent?.trim() || n

// ── Helpers ───────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase();
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
