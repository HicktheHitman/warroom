// js/votes.js
// ─────────────────────────────────────────────────────────
// WARROOM — Weapon Prediction Database (Step 5)
// Community votes on which weapons will appear in MW4
// ─────────────────────────────────────────────────────────

async function loadWeaponsPage() {
  const container = document.getElementById('weapons-content');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;gap:4px;flex-wrap:wrap;" id="weapon-category-filters">
        <button class="filter-btn active" onclick="filterWeapons('all',this)">ALL</button>
        <button class="filter-btn" onclick="filterWeapons('AR',this)">AR</button>
        <button class="filter-btn" onclick="filterWeapons('SMG',this)">SMG</button>
        <button class="filter-btn" onclick="filterWeapons('LMG',this)">LMG</button>
        <button class="filter-btn" onclick="filterWeapons('Sniper',this)">SNIPER</button>
        <button class="filter-btn" onclick="filterWeapons('Shotgun',this)">SHOTGUN</button>
        <button class="filter-btn" onclick="filterWeapons('Pistol',this)">PISTOL</button>
        <button class="filter-btn" onclick="filterWeapons('Launcher',this)">LAUNCHER</button>
        <button class="filter-btn" onclick="filterWeapons('Melee',this)">MELEE</button>
      </div>
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                  letter-spacing:1px;" id="weapon-vote-count"></div>
    </div>
    <div id="weapons-list">
      <div style="text-align:center;padding:2rem 0;"><span class="spinner"></span></div>
    </div>`;

  await fetchWeapons();
}

let weaponsData = [];
let weaponVotesData = {};
let weaponFilter = 'all';

async function fetchWeapons() {
  const profile = getCachedProfile();

  const [weaponsRes, votesRes, userVotesRes] = await Promise.all([
    xhrGet('weapon_vote_summary', 'select=*&order=predict_pct.desc'),
    xhrGet('weapon_vote_summary', 'select=total_votes'),
    profile
      ? xhrGet('weapon_votes', `select=weapon_id,vote&user_id=eq.${profile.id}`)
      : Promise.resolve({ data: [] })
  ]);

  weaponsData = weaponsRes.data || [];

  // Build user vote map
  weaponVotesData = {};
  if (userVotesRes.data) {
    userVotesRes.data.forEach(v => weaponVotesData[v.weapon_id] = v.vote);
  }

  const totalVotes = (votesRes.data || []).reduce((sum, w) => sum + (w.total_votes || 0), 0);
  const voteEl = document.getElementById('weapon-vote-count');
  if (voteEl) voteEl.textContent = `${totalVotes.toLocaleString()} TOTAL VOTES`;

  renderWeapons(weaponsData);
}

function filterWeapons(category, btn) {
  weaponFilter = category;
  document.querySelectorAll('#weapon-category-filters .filter-btn')
    .forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const filtered = category === 'all'
    ? weaponsData
    : weaponsData.filter(w => w.category === category);
  renderWeapons(filtered);
}

function renderWeapons(weapons) {
  const container = document.getElementById('weapons-list');
  const profile = getCachedProfile();

  if (!weapons.length) {
    container.innerHTML = `<div class="card">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                  padding:1rem;text-align:center;">NO WEAPONS IN THIS CATEGORY</div></div>`;
    return;
  }

  // Group by category
  const grouped = {};
  weapons.forEach(w => {
    if (!grouped[w.category]) grouped[w.category] = [];
    grouped[w.category].push(w);
  });

  container.innerHTML = Object.entries(grouped).map(([cat, catWeapons]) => `
    <div class="card" style="margin-bottom:0.75rem;">
      <div class="card-header">
        <div class="card-title">${cat.toUpperCase()}</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);">
          ${catWeapons.length} WEAPONS
        </div>
      </div>
      ${catWeapons.map(w => {
        const pct       = w.predict_pct || 0;
        const barColor  = pct >= 70 ? 'var(--olive-glow)'
                        : pct <= 30 ? 'var(--red)'
                        : 'var(--gold)';
        const userVote  = weaponVotesData[w.id];
        const inActive  = userVote === 1  ? `style="color:var(--olive-glow);border-color:var(--olive);background:var(--olive-bg)"` : '';
        const outActive = userVote === -1 ? `style="color:var(--red);border-color:var(--red-border);background:var(--red-bg)"` : '';
        const typeBadge = w.weapon_type === 'new'
          ? `<span style="font-family:var(--font-mono);font-size:8px;color:var(--gold);
                          border:1px solid var(--gold-dim);padding:1px 5px;
                          background:var(--gold-bg);">NEW</span>`
          : `<span style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                          border:1px solid var(--navy-border);padding:1px 5px;">RETURNING</span>`;

        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;
                      border-bottom:1px solid var(--navy-border-dim);">

            <!-- Weapon info -->
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="font-family:var(--font-body);font-size:14px;font-weight:600;
                             color:var(--bone);">${escHtml(w.name)}</span>
                ${typeBadge}
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;max-width:200px;">
                  <div style="height:4px;background:var(--navy-border);overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${barColor};
                                transition:width 0.5s ease;"></div>
                  </div>
                </div>
                <span style="font-family:var(--font-mono);font-size:10px;
                             color:${barColor};min-width:36px;">${pct}%</span>
                <span style="font-family:var(--font-mono);font-size:9px;
                             color:var(--bone-dim);">${w.total_votes || 0} VOTES</span>
              </div>
            </div>

            <!-- Vote buttons -->
            ${profile ? `
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button class="vote-btn-sm" ${inActive}
                      onclick="voteOnWeapon('${w.id}', 1)"
                      title="Will be in MW4" style="font-size:9px;width:auto;padding:0 8px;">
                IN
              </button>
              <button class="vote-btn-sm" ${outActive}
                      onclick="voteOnWeapon('${w.id}', -1)"
                      title="Won't be in MW4" style="font-size:9px;width:auto;padding:0 8px;">
                OUT
              </button>
            </div>` : `
            <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                        letter-spacing:0.5px;">LOGIN<br>TO VOTE</div>`}

          </div>`;
      }).join('')}
    </div>`
  ).join('');
}

async function voteOnWeapon(weaponId, vote) {
  const profile = getCachedProfile();
  if (!profile) { showToast('AUTHENTICATE TO VOTE', 'error'); return; }

  const prev = weaponVotesData[weaponId];

  // Optimistic update
  weaponVotesData[weaponId] = (prev === vote) ? null : vote;

  if (prev === vote) {
    // Remove vote
    await xhrDelete('weapon_votes', `weapon_id=eq.${weaponId}&user_id=eq.${profile.id}`);
    delete weaponVotesData[weaponId];
  } else if (prev) {
    // Update vote
    await xhrPatch('weapon_votes',
      `weapon_id=eq.${weaponId}&user_id=eq.${profile.id}`, { vote });
  } else {
    // New vote
    const { error } = await xhrPost('weapon_votes', {
      weapon_id: weaponId,
      user_id: profile.id,
      vote
    });
    if (error) { showToast('VOTE FAILED', 'error'); return; }
  }

  // Refresh to get updated percentages
  await fetchWeapons();
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
