// js/intel.js
// ─────────────────────────────────────────────────────────
// WARROOM — Intel Feed page (Step 3)
// Loads: urgent alerts, confirmed intel board, hype meter
// ─────────────────────────────────────────────────────────

async function loadIntelPage() {
  const container = document.getElementById('intel-content');

  // Render shell immediately
  container.innerHTML = `
    <div class="deployment-banner">
      <div>
        <div class="deploy-label">STATUS // PRE-DEPLOYMENT</div>
        <div class="deploy-title">TIME TO DEPLOYMENT: MW4</div>
      </div>
      <div class="countdown" id="countdown-display"></div>
    </div>
    <div id="urgent-alerts"></div>
    <div class="grid-2" style="margin-bottom:1rem;">
      <div id="confirmed-intel-wrap">
        <div class="card card-top">
          <div class="card-header">
            <div class="card-title">CONFIRMED INTEL</div>
            <div class="dot dot-gold"></div>
          </div>
          <div style="text-align:center;padding:1rem 0;">
            <span class="spinner"></span>
          </div>
        </div>
      </div>
      <div id="hype-wrap">
        <div class="card card-top">
          <div class="card-header">
            <div class="card-title">COMMUNITY HYPE METER</div>
          </div>
          <div style="text-align:center;padding:1rem 0;">
            <span class="spinner"></span>
          </div>
        </div>
      </div>
    </div>`;

  renderCountdown('countdown-display');

  // Load intel + hype in parallel
  const [intelRes, hypeRes, userHypeRes] = await Promise.all([
    xhrGet('intel_posts', 'select=*&order=created_at.desc'),
    xhrGet('hype_aggregate', 'select=*'),
    getCachedProfile() ? xhrGet('hype_votes', `select=score&user_id=eq.${getCachedProfile().id}`) : Promise.resolve({ data: [] })
  ]);

  renderUrgentAlerts(intelRes.data || []);
  renderConfirmedIntel(intelRes.data || []);
  renderHypeMeter(hypeRes.data?.[0] || { hype_score: 0, total_votes: 0 }, userHypeRes.data?.[0]?.score || 0);
}

// ── Urgent alerts (red banner) ────────────────────────────

function renderUrgentAlerts(posts) {
  const container = document.getElementById('urgent-alerts');
  const urgent = posts.filter(p => p.status === 'urgent');
  if (!urgent.length) { container.innerHTML = ''; return; }

  container.innerHTML = urgent.map(p => `
    <div class="alert-banner" style="margin-bottom:0.5rem;">
      <span class="dot dot-red"></span>
      <span class="alert-tag blink">URGENT INTEL</span>
      <span class="alert-text">${escHtml(p.title)}</span>
    </div>`).join('');
}

// ── Confirmed Intel Board ─────────────────────────────────

function renderConfirmedIntel(posts) {
  const container = document.getElementById('confirmed-intel-wrap');
  const confirmed = posts.filter(p => p.status !== 'urgent' || true); // show all non-debunked

  if (!confirmed.length) {
    container.innerHTML = `
      <div class="card card-top">
        <div class="card-header">
          <div class="card-title">CONFIRMED INTEL</div>
          <div class="dot dot-gold"></div>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1rem 0;text-align:center;letter-spacing:1px;">
          NO INTEL POSTED YET — CHECK BACK SOON
        </div>
      </div>`;
    return;
  }

  const items = confirmed.map(p => {
    const date = new Date(p.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const badgeClass = p.status === 'urgent' ? 'badge-urgent' : 'badge-confirmed';
    const badgeText  = p.status === 'urgent' ? 'URGENT' : 'CONFIRMED';
    return `
      <div class="intel-item">
        <div><span class="badge ${badgeClass}">${badgeText}</span></div>
        <div style="flex:1;">
          <div class="intel-text">${escHtml(p.title)}</div>
          ${p.body ? `<div class="intel-body">${escHtml(p.body)}</div>` : ''}
          <div class="intel-source">
            ${p.source_name ? `SRC // ${escHtml(p.source_name).toUpperCase()}` : ''}
            ${p.source_name ? ' — ' : ''}
            ${date.toUpperCase()}
          </div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="card card-top">
      <div class="card-header">
        <div class="card-title">CONFIRMED INTEL</div>
        <div class="dot dot-gold"></div>
      </div>
      ${items}
    </div>`;
}

// ── Hype Meter ────────────────────────────────────────────

let currentHypeScore = 0;

function renderHypeMeter(aggregate, userVote) {
  currentHypeScore = aggregate.hype_score || 0;
  const totalVotes = aggregate.total_votes || 0;
  const profile = getCachedProfile();

  document.getElementById('hype-wrap').innerHTML = `
    <div class="card card-top">
      <div class="card-header">
        <div class="card-title">COMMUNITY HYPE METER</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);">
          ${totalVotes.toLocaleString()} VOTES
        </div>
      </div>
      <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;">
        <div style="text-align:center;flex:0 0 100px;">
          <div style="font-family:var(--font-mil);font-size:52px;font-weight:900;
                      color:var(--gold-bright);line-height:1;" id="hype-score-display">
            ${currentHypeScore}
          </div>
          <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                      letter-spacing:2px;margin-top:4px;">HYPE SCORE</div>
        </div>
        <div style="flex:1;min-width:160px;">
          <div style="display:flex;justify-content:space-between;
                      font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                      margin-bottom:4px;"><span>LOW</span><span>HIGH</span></div>
          <div style="height:8px;background:var(--navy-border);overflow:hidden;">
            <div id="hype-bar-fill"
                 style="height:100%;background:linear-gradient(90deg,var(--gold-dark),var(--gold-bright));
                        width:${currentHypeScore}%;transition:width 0.5s ease;"></div>
          </div>
          ${profile ? `
          <div style="margin-top:10px;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                        letter-spacing:1px;margin-bottom:6px;">
              YOUR VOTE: <span id="hype-vote-display" style="color:var(--gold);">
                ${userVote ? userVote + '/100' : 'NOT VOTED'}
              </span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="range" id="hype-slider" min="1" max="100"
                     value="${userVote || 50}"
                     style="flex:1;accent-color:var(--gold);">
              <button class="btn btn-primary" style="padding:6px 12px;font-size:9px;"
                      onclick="submitHypeVote()">VOTE</button>
            </div>
          </div>` : `
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                      margin-top:8px;letter-spacing:1px;">
            <a href="#" onclick="navTo('dossier',null)" style="color:var(--gold);">
              AUTHENTICATE
            </a> TO VOTE
          </div>`}
        </div>
      </div>
    </div>`;

  // Live slider preview
  const slider = document.getElementById('hype-slider');
  if (slider) {
    slider.addEventListener('input', function() {
      document.getElementById('hype-vote-display').textContent = this.value + '/100';
    });
  }
}

async function submitHypeVote() {
  const profile = getCachedProfile();
  if (!profile) return;
  const score = parseInt(document.getElementById('hype-slider').value, 10);

  // Upsert — one vote per user
  const { error } = await xhrRequest('POST', `${API_BASE}/hype_votes`, {
    user_id: profile.id,
    score
  });

  if (error) {
    // Try patch if insert failed (already voted)
    await xhrPatch('hype_votes', `user_id=eq.${profile.id}`, { score });
  }

  // Reload hype data
  const hypeRes = await xhrGet('hype_aggregate', 'select=*');
  const agg = hypeRes.data?.[0] || { hype_score: score, total_votes: 1 };
  currentHypeScore = agg.hype_score;
  document.getElementById('hype-score-display').textContent = currentHypeScore;
  document.getElementById('hype-bar-fill').style.width = currentHypeScore + '%';
  document.getElementById('hype-vote-display').textContent = score + '/100';
  showToast('HYPE VOTE FILED', 'success');
}

// ── Helpers ───────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
