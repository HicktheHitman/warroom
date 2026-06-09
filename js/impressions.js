// js/impressions.js
// WARROOM — First Impressions Community Board

const IMP_CATS = ['GAMEPLAY', 'GRAPHICS', 'AUDIO', 'CONTENT'];

let _impAll    = [];
let _impMine   = null;

async function loadImpressionsPage() {
  const container = document.getElementById('impressions-content');
  const profile   = getCachedProfile();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    letter-spacing:2px;margin-bottom:4px;">PHASE 02 — LAUNCH WEEK</div>
        <div style="font-family:var(--font-mil);font-size:20px;letter-spacing:3px;
                    color:var(--bone);">FIRST IMPRESSIONS</div>
      </div>
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                  letter-spacing:1px;" id="imp-count"></div>
    </div>
    <div id="imp-main">
      <div style="text-align:center;padding:2rem;"><span class="spinner"></span></div>
    </div>`;

  const [allRes, myRes] = await Promise.all([
    xhrGet('first_impressions_with_author', 'select=*&order=created_at.desc'),
    profile
      ? xhrGet('first_impressions', `select=*&user_id=eq.${profile.id}`)
      : Promise.resolve({ data: [] })
  ]);

  _impAll  = allRes.data  || [];
  _impMine = (myRes.data  || [])[0] || null;

  const countEl = document.getElementById('imp-count');
  if (countEl) countEl.textContent = `${_impAll.length} OPERATIVE${_impAll.length !== 1 ? 'S' : ''} REPORTED IN`;

  renderImpressionsPage(profile);
}

function renderImpressionsPage(profile) {
  const main = document.getElementById('imp-main');
  if (!main) return;

  main.innerHTML = `
    ${renderAggregates()}
    ${profile
      ? (_impMine ? renderMyImpression() : renderSubmitForm())
      : `<div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                     text-align:center;padding:0.5rem 0 1rem;letter-spacing:1px;">
           <a href="#" onclick="navTo('dossier',null)" style="color:var(--gold);">AUTHENTICATE</a>
           TO SUBMIT YOUR IMPRESSION
         </div>`}
    ${renderFeed()}`;

  wireBodyCounter();
}

// ── Community Aggregates ──────────────────────────────────

function renderAggregates() {
  if (!_impAll.length) {
    return `
      <div class="card card-top" style="margin-bottom:1rem;">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1rem;text-align:center;letter-spacing:1px;">
          NO IMPRESSIONS YET — BE THE FIRST TO REPORT IN
        </div>
      </div>`;
  }

  const avg = field => {
    const valid = _impAll.filter(r => r[field] != null);
    if (!valid.length) return null;
    return (valid.reduce((s, r) => s + r[field], 0) / valid.length).toFixed(1);
  };

  const overall = avg('score_overall');

  return `
    <div class="card card-top" style="margin-bottom:1rem;">
      <div class="card-header">
        <div class="card-title">COMMUNITY SCORE</div>
        <div class="dot dot-gold"></div>
      </div>
      <div style="display:flex;align-items:center;gap:2rem;flex-wrap:wrap;">
        <div style="text-align:center;flex:0 0 80px;">
          <div style="font-family:var(--font-mil);font-size:56px;font-weight:900;
                      color:var(--gold-bright);line-height:1;">${overall}</div>
          <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                      letter-spacing:2px;margin-top:4px;">OUT OF 10</div>
        </div>
        <div style="flex:1;min-width:200px;">
          ${IMP_CATS.map(cat => {
            const key = `score_${cat.toLowerCase()}`;
            const val = avg(key);
            if (!val) return '';
            const pct = (parseFloat(val) / 10 * 100).toFixed(0);
            return `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                            letter-spacing:1px;width:70px;flex-shrink:0;">${cat}</div>
                <div style="flex:1;height:6px;background:var(--navy-border);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;
                              background:linear-gradient(90deg,var(--gold-dark),var(--gold-bright));
                              transition:width 0.4s ease;"></div>
                </div>
                <div style="font-family:var(--font-mono);font-size:9px;color:var(--gold);
                            width:28px;text-align:right;">${val}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

// ── Submit Form ───────────────────────────────────────────

function renderSubmitForm(prefill) {
  const p = prefill || {};
  return `
    <div class="card card-top" style="margin-bottom:1rem;" id="imp-form-card">
      <div class="card-header">
        <div class="card-title">${prefill ? 'EDIT YOUR IMPRESSION' : 'SUBMIT YOUR IMPRESSION'}</div>
        ${prefill ? `<button class="btn btn-ghost" style="font-size:8px;"
                             onclick="cancelEditImpression()">CANCEL</button>` : ''}
      </div>
      <div class="error-msg" id="imp-form-error"></div>

      ${['OVERALL', ...IMP_CATS].map(cat => {
        const key   = `score_${cat.toLowerCase()}`;
        const val   = p[key] || 5;
        const req   = cat === 'OVERALL' ? ' *' : '';
        return `
          <div class="field-group" style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;
                        margin-bottom:4px;">
              <label class="field-label" style="margin:0;">${cat}${req}</label>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--gold);"
                    id="imp-lbl-${cat}">${val}/10</span>
            </div>
            <input type="range" id="imp-${cat}" min="1" max="10" value="${val}"
                   style="width:100%;accent-color:var(--gold);"
                   oninput="document.getElementById('imp-lbl-${cat}').textContent=this.value+'/10'">
          </div>`;
      }).join('')}

      <div class="field-group">
        <label class="field-label" for="imp-body">IMPRESSIONS (OPTIONAL)</label>
        <textarea class="mil-input" id="imp-body" rows="3" maxlength="500"
                  placeholder="Your thoughts on MW4 at launch...">${p.body || ''}</textarea>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    text-align:right;margin-top:3px;" id="imp-body-count">
          ${(p.body || '').length} / 500
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="imp-embed">ATTACH CLIP (OPTIONAL)</label>
        <input class="mil-input" type="url" id="imp-embed"
               value="${impEsc(p.embed_url || '')}"
               placeholder="YouTube, TikTok, or X/Twitter link">
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    margin-top:4px;letter-spacing:0.5px;">
          YOUTUBE EMBEDS INLINE — TIKTOK/X SHOWN AS LINK
        </div>
      </div>

      <button class="btn btn-primary" id="btn-imp-submit"
              onclick="${prefill ? 'updateImpression()' : 'submitImpression()'}"
              style="width:100%;margin-top:4px;">
        ${prefill ? 'UPDATE IMPRESSION' : 'SUBMIT IMPRESSION'}
      </button>
    </div>`;
}

function renderMyImpression() {
  const r   = _impMine;
  const col = impScoreColor(r.score_overall);
  return `
    <div class="card card-top" style="margin-bottom:1rem;border-left:3px solid var(--gold);">
      <div class="card-header">
        <div class="card-title">YOUR IMPRESSION</div>
        <button class="btn btn-ghost" style="font-size:8px;"
                onclick="editImpression()">EDIT</button>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div style="font-family:var(--font-mil);font-size:40px;font-weight:900;
                    color:${col};line-height:1;">${r.score_overall}<span style="font-size:16px;
                    color:var(--bone-dim);">/10</span></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${IMP_CATS.map(cat => {
            const val = r[`score_${cat.toLowerCase()}`];
            if (!val) return '';
            return `<div style="text-align:center;">
              <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                          letter-spacing:1px;">${cat}</div>
              <div style="font-family:var(--font-mono);font-size:13px;color:var(--bone);">
                ${val}/10
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ${r.body ? `<div style="font-family:var(--font-body);font-size:13px;color:var(--bone-muted);
                              margin-top:8px;line-height:1.5;">${impEsc(r.body)}</div>` : ''}
      ${impBuildEmbed(r.embed_url, r.embed_type)}
    </div>`;
}

// ── Feed ──────────────────────────────────────────────────

function renderFeed() {
  if (!_impAll.length) return '';

  return `
    <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                letter-spacing:2px;margin-bottom:8px;">OPERATIVE IMPRESSIONS</div>
    ${_impAll.map(r => {
      const timeAgo  = impTimeAgo(r.created_at);
      const col      = impScoreColor(r.score_overall);
      const roleBadge = r.role === 'admin' || r.role === 'command'
        ? `<span class="badge badge-command">COMMAND</span>`
        : `<span class="badge badge-operative">OPERATIVE</span>`;

      return `
        <div class="card" style="margin-bottom:0.75rem;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <div style="width:36px;height:36px;background:var(--navy-border);
                        border:1px solid var(--navy-border);display:flex;align-items:center;
                        justify-content:center;font-family:var(--font-mil);font-size:13px;
                        color:var(--gold);flex-shrink:0;">
              ${impEsc(r.callsign || '?').charAt(0)}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;
                          flex-wrap:wrap;">
                <span style="font-family:var(--font-mono);font-size:10px;color:var(--gold);
                             letter-spacing:1px;">${impEsc(r.callsign || 'UNKNOWN')}</span>
                ${roleBadge}
                <span style="font-family:var(--font-mono);font-size:9px;
                             color:var(--bone-dim);">${timeAgo}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div style="font-family:var(--font-mil);font-size:28px;font-weight:900;
                            color:${col};line-height:1;">${r.score_overall}
                  <span style="font-family:var(--font-mono);font-size:9px;
                               color:var(--bone-dim);">/10</span>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  ${IMP_CATS.map(cat => {
                    const val = r[`score_${cat.toLowerCase()}`];
                    if (!val) return '';
                    return `<div style="text-align:center;">
                      <div style="font-family:var(--font-mono);font-size:7px;
                                  color:var(--bone-dim);letter-spacing:1px;">${cat}</div>
                      <div style="font-family:var(--font-mono);font-size:11px;
                                  color:var(--bone);">${val}</div>
                    </div>`;
                  }).join('')}
                </div>
              </div>
              ${r.body ? `
              <div style="font-family:var(--font-body);font-size:13px;color:var(--bone-muted);
                          margin-top:6px;line-height:1.5;">${impEsc(r.body)}</div>` : ''}
              ${impBuildEmbed(r.embed_url, r.embed_type)}
            </div>
          </div>
        </div>`;
    }).join('')}`;
}

// ── Edit helpers ──────────────────────────────────────────

function editImpression() {
  const formHtml = renderSubmitForm(_impMine);
  const card     = document.getElementById('imp-form-card');
  if (card) {
    card.outerHTML = formHtml;
  } else {
    const myCard = document.querySelector('[style*="border-left:3px solid var(--gold)"]');
    if (myCard) myCard.outerHTML = formHtml;
  }
  wireBodyCounter();
}

function cancelEditImpression() {
  const profile = getCachedProfile();
  renderImpressionsPage(profile);
}

function wireBodyCounter() {
  const ta = document.getElementById('imp-body');
  const cc = document.getElementById('imp-body-count');
  if (ta && cc) {
    ta.addEventListener('input', () => {
      cc.textContent = `${ta.value.length} / 500`;
      cc.style.color = ta.value.length > 450 ? 'var(--red)' : 'var(--bone-dim)';
    });
  }
}

// ── Submit / Update ───────────────────────────────────────

function collectFormData() {
  const embedUrl = document.getElementById('imp-embed').value.trim();
  let embedType  = null;
  if (embedUrl) {
    if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) embedType = 'youtube';
    else if (embedUrl.includes('tiktok.com'))                               embedType = 'tiktok';
    else if (embedUrl.includes('twitter.com') || embedUrl.includes('x.com')) embedType = 'twitter';
  }
  return {
    score_overall:  parseInt(document.getElementById('imp-OVERALL').value,  10),
    score_gameplay: parseInt(document.getElementById('imp-GAMEPLAY').value, 10),
    score_graphics: parseInt(document.getElementById('imp-GRAPHICS').value, 10),
    score_audio:    parseInt(document.getElementById('imp-AUDIO').value,    10),
    score_content:  parseInt(document.getElementById('imp-CONTENT').value,  10),
    body:           document.getElementById('imp-body').value.trim() || null,
    embed_url:      embedUrl  || null,
    embed_type:     embedType || null,
  };
}

async function submitImpression() {
  const profile = getCachedProfile();
  const errEl   = document.getElementById('imp-form-error');
  const btn     = document.getElementById('btn-imp-submit');
  errEl.classList.remove('visible');

  const payload = { ...collectFormData(), user_id: profile.id };
  setButtonLoading(btn, 'TRANSMITTING...');

  const { error } = await xhrPost('first_impressions', payload);
  resetButton(btn, 'SUBMIT IMPRESSION');

  if (error) {
    errEl.textContent = 'FAILED TO SUBMIT: ' + error;
    errEl.classList.add('visible');
    return;
  }

  showToast('IMPRESSION FILED', 'success');
  await loadImpressionsPage();
}

async function updateImpression() {
  const profile = getCachedProfile();
  const errEl   = document.getElementById('imp-form-error');
  const btn     = document.getElementById('btn-imp-submit');
  errEl.classList.remove('visible');

  const payload = { ...collectFormData(), updated_at: new Date().toISOString() };
  setButtonLoading(btn, 'SAVING...');

  const { error } = await xhrPatch('first_impressions', `user_id=eq.${profile.id}`, payload);
  resetButton(btn, 'UPDATE IMPRESSION');

  if (error) {
    errEl.textContent = 'FAILED TO UPDATE: ' + error;
    errEl.classList.add('visible');
    return;
  }

  showToast('IMPRESSION UPDATED', 'success');
  await loadImpressionsPage();
}

// ── Embed builder ─────────────────────────────────────────

function impBuildEmbed(url, type) {
  if (!url) return '';
  if (!type) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
    else if (url.includes('tiktok.com'))                          type = 'tiktok';
    else if (url.includes('twitter.com') || url.includes('x.com')) type = 'twitter';
  }
  if (type === 'youtube') {
    const videoId = impYoutubeId(url);
    if (!videoId) return `<a href="${impEsc(url)}" target="_blank" rel="noopener"
      style="font-family:var(--font-mono);font-size:10px;color:var(--gold);">
      VIEW CLIP ↗</a>`;
    return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;
                        margin-top:10px;">
      <iframe src="https://www.youtube.com/embed/${videoId}"
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
              allowfullscreen loading="lazy"></iframe>
    </div>`;
  }
  const label = type === 'tiktok' ? '▶ VIEW ON TIKTOK' : type === 'twitter' ? '▶ VIEW ON X' : '▶ VIEW CLIP';
  return `<a href="${impEsc(url)}" target="_blank" rel="noopener"
    style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;
           font-family:var(--font-mono);font-size:10px;color:var(--gold);
           border:1px solid var(--gold-dim);padding:4px 10px;
           background:var(--gold-bg);">${label} ↗</a>`;
}

function impYoutubeId(url) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// ── Helpers ───────────────────────────────────────────────

function impScoreColor(score) {
  if (score >= 8) return 'var(--gold-bright)';
  if (score >= 6) return '#7aad3f';
  if (score >= 4) return '#c9a84c';
  return '#c94040';
}

function impTimeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'JUST NOW';
  if (mins  < 60) return `${mins}M AGO`;
  if (hours < 24) return `${hours}HR AGO`;
  return `${days}D AGO`;
}

function impEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
