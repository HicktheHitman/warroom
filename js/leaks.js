// js/leaks.js
// ─────────────────────────────────────────────────────────
// WARROOM — Leak Tracker (Step 4)
// Community submits leaks, votes credibility, admin manages state
// ─────────────────────────────────────────────────────────

let leaksData = [];
let leaksFilter = 'all';

async function loadLeaksPage() {
  const container = document.getElementById('leaks-content');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="filter-btn active" data-filter="all" onclick="filterLeaks('all',this)">ALL</button>
        <button class="filter-btn" data-filter="unconfirmed" onclick="filterLeaks('unconfirmed',this)">UNCONFIRMED</button>
        <button class="filter-btn" data-filter="confirmed" onclick="filterLeaks('confirmed',this)">CONFIRMED</button>
        <button class="filter-btn" data-filter="debunked" onclick="filterLeaks('debunked',this)">DEBUNKED</button>
      </div>
      <button class="btn btn-primary" style="font-size:9px;padding:8px 14px;"
              onclick="showFileLeakModal()">+ FILE A REPORT</button>
    </div>
    <div id="leaks-list">
      <div style="text-align:center;padding:2rem 0;"><span class="spinner"></span></div>
    </div>
    <div id="leak-modal-overlay" class="modal-overlay hidden" onclick="closeLeakModal(event)"></div>`;

  await fetchLeaks();
}

async function fetchLeaks() {
  const { data, error } = await xhrGet(
    'leaks',
    'select=*,profiles(callsign)&order=created_at.desc'
  );

  if (error) {
    document.getElementById('leaks-list').innerHTML = `
      <div class="card"><div style="font-family:var(--font-mono);font-size:10px;
        color:var(--bone-dim);padding:1rem;text-align:center;">
        FAILED TO LOAD LEAKS</div></div>`;
    return;
  }

  leaksData = data || [];

  // Load user's votes if logged in
  const profile = getCachedProfile();
  let userVotes = {};
  if (profile) {
    const { data: votes } = await xhrGet(
      'leak_votes',
      `select=leak_id,vote&user_id=eq.${profile.id}`
    );
    if (votes) votes.forEach(v => userVotes[v.leak_id] = v.vote);
  }

  renderLeaks(leaksData, userVotes);
}

function filterLeaks(filter, btn) {
  leaksFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const profile = getCachedProfile();
  let userVotes = {};
  const filtered = filter === 'all' ? leaksData : leaksData.filter(l => l.state === filter);
  renderLeaks(filtered, userVotes);
}

function renderLeaks(leaks, userVotes = {}) {
  const container = document.getElementById('leaks-list');
  const profile = getCachedProfile();
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'command');

  if (!leaks.length) {
    container.innerHTML = `
      <div class="card card-top-olive">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1.5rem;text-align:center;letter-spacing:1px;">
          ${leaksFilter === 'all' ? 'NO LEAKS FILED YET — BE THE FIRST OPERATIVE TO SUBMIT' : 'NO ' + leaksFilter.toUpperCase() + ' LEAKS'}
        </div>
      </div>`;
    return;
  }

  container.innerHTML = leaks.map(leak => {
    const date = new Date(leak.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const badgeClass = leak.state === 'confirmed' ? 'badge-confirmed'
                     : leak.state === 'debunked'  ? 'badge-debunked'
                     : 'badge-unconfirmed';
    const badgeText  = leak.state === 'confirmed' ? 'CONFIRMED'
                     : leak.state === 'debunked'  ? 'DEBUNKED'
                     : 'UNCONFIRMED';

    const credPct    = leak.credibility_pct || 50;
    const credColor  = credPct >= 70 ? 'var(--olive-glow)'
                     : credPct <= 30 ? 'var(--red)'
                     : 'var(--gold)';

    const userVote   = userVotes[leak.id];
    const upActive   = userVote === 1  ? 'style="color:var(--olive-glow);border-color:var(--olive)"' : '';
    const downActive = userVote === -1 ? 'style="color:var(--red);border-color:var(--red)"' : '';

    const callsign = leak.profiles?.callsign || 'UNKNOWN';

    const adminControls = isAdmin ? `
      <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost" style="font-size:8px;padding:3px 8px;
                color:var(--olive-glow);border:1px solid var(--olive);"
                onclick="setLeakState('${leak.id}','confirmed')">CONFIRM</button>
        <button class="btn btn-ghost" style="font-size:8px;padding:3px 8px;"
                onclick="setLeakState('${leak.id}','unconfirmed')">UNCONFIRM</button>
        <button class="btn btn-ghost" style="font-size:8px;padding:3px 8px;
                color:var(--red);border:1px solid var(--red-border);"
                onclick="setLeakState('${leak.id}','debunked')">DEBUNK</button>
        <button class="btn btn-ghost" style="font-size:8px;padding:3px 8px;
                color:var(--bone-dim);"
                onclick="deleteLeak('${leak.id}')">DELETE</button>
      </div>` : '';

    return `
      <div class="card" style="margin-bottom:0.75rem;">
        <div style="display:flex;align-items:flex-start;gap:12px;">

          <!-- Vote column -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;
                      flex-shrink:0;padding-top:2px;">
            <button class="vote-btn-sm" ${upActive}
                    onclick="voteOnLeak('${leak.id}', 1)"
                    title="Credible">▲</button>
            <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;
                        color:${credColor};min-width:32px;text-align:center;">
              ${credPct}%
            </div>
            <button class="vote-btn-sm" ${downActive}
                    onclick="voteOnLeak('${leak.id}', -1)"
                    title="Not credible">▼</button>
          </div>

          <!-- Content -->
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <span class="badge ${badgeClass}">${badgeText}</span>
              ${leak.source_hint ? `<span style="font-family:var(--font-mono);font-size:9px;
                color:var(--bone-dim);">SRC: ${escHtml(leak.source_hint).toUpperCase()}</span>` : ''}
            </div>
            <div style="font-family:var(--font-body);font-size:14px;font-weight:600;
                        color:${leak.state === 'debunked' ? 'var(--bone-dim)' : 'var(--bone)'};
                        line-height:1.4;margin-bottom:4px;
                        ${leak.state === 'debunked' ? 'text-decoration:line-through;' : ''}">
              ${escHtml(leak.title)}
            </div>
            ${leak.body ? `<div style="font-family:var(--font-body);font-size:12px;
              color:var(--bone-muted);line-height:1.5;margin-bottom:6px;">
              ${escHtml(leak.body)}</div>` : ''}
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                        display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span>FILED BY ${escHtml(callsign)}</span>
              <span>—</span>
              <span>${date.toUpperCase()}</span>
              <span>—</span>
              <span style="color:${credColor};">CREDIBILITY: ${credPct}%</span>
            </div>
            ${adminControls}
          </div>

        </div>
      </div>`;
  }).join('');
}

// ── Vote on leak ─────────────────────────────────────────

async function voteOnLeak(leakId, vote) {
  const profile = getCachedProfile();
  if (!profile) {
    showToast('AUTHENTICATE TO VOTE', 'error');
    return;
  }

  // Try insert first, then update if already voted
  const { error } = await xhrPost('leak_votes', {
    leak_id: leakId,
    user_id: profile.id,
    vote
  });

  if (error) {
    // Already voted — update
    await xhrPatch('leak_votes', `leak_id=eq.${leakId}&user_id=eq.${profile.id}`, { vote });
  }

  await fetchLeaks();
}

// ── Admin: set leak state ─────────────────────────────────

async function setLeakState(leakId, state) {
  const { error } = await xhrPatch('leaks', `id=eq.${leakId}`, { state });
  if (error) { showToast('UPDATE FAILED', 'error'); return; }
  showToast(`LEAK MARKED ${state.toUpperCase()}`, 'success');
  await fetchLeaks();
}

async function deleteLeak(leakId) {
  if (!confirm('DELETE THIS LEAK?')) return;
  const { error } = await xhrDelete('leaks', `id=eq.${leakId}`);
  if (error) { showToast('DELETE FAILED', 'error'); return; }
  showToast('LEAK DELETED', 'default');
  await fetchLeaks();
}

// ── File a leak modal ─────────────────────────────────────

function showFileLeakModal() {
  const profile = getCachedProfile();
  const overlay = document.getElementById('leak-modal-overlay');

  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">FILE A LEAK REPORT</div>
      <div class="error-msg" id="leak-submit-error"></div>

      <div class="field-group">
        <label class="field-label" for="leak-title">LEAK SUMMARY</label>
        <input class="mil-input" type="text" id="leak-title" maxlength="200"
               placeholder="WHAT'S THE LEAK?">
      </div>
      <div class="field-group">
        <label class="field-label" for="leak-body">DETAILS (OPTIONAL)</label>
        <textarea class="mil-input" id="leak-body" rows="3"
                  placeholder="Any additional context, links, or details..."></textarea>
      </div>
      <div class="field-group">
        <label class="field-label" for="leak-source">SOURCE HINT</label>
        <input class="mil-input" type="text" id="leak-source" maxlength="100"
               placeholder="E.G. DATA MINE, INSIDER, TWITTER LEAK">
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeLeakModal()">CANCEL</button>
        ${profile
          ? `<button class="btn btn-primary" id="btn-submit-leak" onclick="submitLeak()">TRANSMIT LEAK</button>`
          : `<div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                         letter-spacing:1px;">AUTHENTICATE TO FILE LEAKS</div>`
        }
      </div>
    </div>`;

  overlay.classList.remove('hidden');
}

function closeLeakModal(event) {
  if (!event || event.target.id === 'leak-modal-overlay') {
    document.getElementById('leak-modal-overlay').classList.add('hidden');
  }
}

async function submitLeak() {
  const title  = document.getElementById('leak-title').value.trim();
  const body   = document.getElementById('leak-body').value.trim();
  const source = document.getElementById('leak-source').value.trim();
  const errEl  = document.getElementById('leak-submit-error');
  const btn    = document.getElementById('btn-submit-leak');
  const profile = getCachedProfile();

  errEl.classList.remove('visible');

  if (!title) {
    errEl.textContent = 'LEAK SUMMARY IS REQUIRED';
    errEl.classList.add('visible');
    return;
  }
  if (!profile) {
    errEl.textContent = 'YOU MUST BE AUTHENTICATED TO FILE LEAKS';
    errEl.classList.add('visible');
    return;
  }

  setButtonLoading(btn, 'TRANSMITTING...');

  const { error } = await xhrPost('leaks', {
    title,
    body:         body   || null,
    source_hint:  source || null,
    submitted_by: profile.id,
    state:        'unconfirmed',
    credibility_pct: 50
  });

  resetButton(btn, 'TRANSMIT LEAK');

  if (error) {
    errEl.textContent = 'FAILED TO SUBMIT: ' + error;
    errEl.classList.add('visible');
    return;
  }

  closeLeakModal();
  showToast('LEAK FILED — OPERATIVES CAN NOW VOTE', 'success');
  await fetchLeaks();
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
