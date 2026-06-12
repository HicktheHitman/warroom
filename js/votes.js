// js/votes.js
// ─────────────────────────────────────────────────────────
// WARROOM — Weapon Prediction Database (Step 5)
// Community votes on which weapons will appear in MW4
// ─────────────────────────────────────────────────────────


// ── Weapon category icons (SVG silhouettes) ───────────────

const WEAPON_ICONS = {
  // Modern AR — pistol grip, angled mag, muzzle device, rail, collapsible stock
  'AR': `<svg width="46" height="20" viewBox="0 0 46 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="8" width="2" height="4" rx="0.4" fill="currentColor"/>
    <rect x="1" y="9" width="13" height="2" rx="0.3" fill="currentColor"/>
    <rect x="3" y="7" width="12" height="6" rx="1" fill="currentColor" opacity="0.75"/>
    <rect x="14" y="6" width="14" height="5" rx="0.5" fill="currentColor"/>
    <rect x="14" y="5" width="14" height="1.5" rx="0.3" fill="currentColor" opacity="0.45"/>
    <rect x="14" y="11" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.88"/>
    <polygon points="23,14 26,14 25,20 22,20" fill="currentColor"/>
    <polygon points="16,14 21,14 20,20 15,20" fill="currentColor" opacity="0.82"/>
    <rect x="28" y="8" width="8" height="3" rx="0.5" fill="currentColor"/>
    <rect x="34" y="7" width="7" height="5" rx="0.5" fill="currentColor" opacity="0.65"/>
  </svg>`,
  // Modern SMG — compact body, short barrel, pistol grip, small mag, folding stock
  'SMG': `<svg width="34" height="20" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="8" width="2" height="4" rx="0.4" fill="currentColor"/>
    <rect x="1" y="9" width="9" height="2" rx="0.3" fill="currentColor"/>
    <rect x="3" y="7" width="8" height="6" rx="1" fill="currentColor" opacity="0.75"/>
    <rect x="10" y="6" width="13" height="7" rx="1" fill="currentColor"/>
    <rect x="10" y="5" width="13" height="1.5" rx="0.3" fill="currentColor" opacity="0.45"/>
    <polygon points="20,13 23,13 22,20 19,20" fill="currentColor"/>
    <polygon points="13,13 18,13 17,20 12,20" fill="currentColor" opacity="0.82"/>
    <rect x="23" y="8" width="7" height="3" rx="0.5" fill="currentColor"/>
    <rect x="28" y="7" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.6"/>
  </svg>`,
  // Modern LMG — long barrel, bipod, heavy receiver, large box mag, pistol grip
  'LMG': `<svg width="52" height="22" viewBox="0 0 52 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="9" width="2" height="4" rx="0.4" fill="currentColor"/>
    <rect x="1" y="10" width="18" height="2" rx="0.3" fill="currentColor"/>
    <rect x="2" y="11" width="1.5" height="6" rx="0.5" fill="currentColor" opacity="0.62"/>
    <rect x="7" y="11" width="1.5" height="6" rx="0.5" fill="currentColor" opacity="0.62"/>
    <rect x="4" y="7" width="14" height="7" rx="1" fill="currentColor" opacity="0.75"/>
    <rect x="17" y="6" width="16" height="5" rx="0.5" fill="currentColor"/>
    <rect x="17" y="5" width="16" height="1.5" rx="0.3" fill="currentColor" opacity="0.45"/>
    <rect x="17" y="11" width="12" height="3" rx="0.5" fill="currentColor" opacity="0.88"/>
    <rect x="19" y="14" width="9" height="7" rx="0.5" fill="currentColor" opacity="0.8"/>
    <polygon points="28,14 31,14 30,21 27,21" fill="currentColor"/>
    <rect x="33" y="7" width="11" height="4" rx="0.5" fill="currentColor"/>
    <rect x="40" y="6" width="7" height="6" rx="0.5" fill="currentColor" opacity="0.62"/>
  </svg>`,
  // Modern Sniper — long barrel, scope, bipod, adjustable stock, pistol grip
  'Sniper': `<svg width="52" height="18" viewBox="0 0 52 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="8" width="2" height="3" rx="0.4" fill="currentColor"/>
    <rect x="1" y="8.5" width="20" height="2" rx="0.3" fill="currentColor"/>
    <rect x="3" y="10" width="1.5" height="5" rx="0.5" fill="currentColor" opacity="0.62"/>
    <rect x="8" y="10" width="1.5" height="5" rx="0.5" fill="currentColor" opacity="0.62"/>
    <rect x="19" y="7" width="16" height="5" rx="0.5" fill="currentColor"/>
    <rect x="22" y="3" width="11" height="4" rx="1" fill="currentColor" opacity="0.85"/>
    <rect x="22" y="3.5" width="2.5" height="3" rx="0.4" fill="currentColor" opacity="0.4"/>
    <rect x="30.5" y="3.5" width="2.5" height="3" rx="0.4" fill="currentColor" opacity="0.4"/>
    <polygon points="31,12 33,12 32,17 30,17" fill="currentColor"/>
    <rect x="24" y="12" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.8"/>
    <rect x="35" y="8" width="10" height="3" rx="0.5" fill="currentColor"/>
    <rect x="43" y="7" width="8" height="5" rx="0.5" fill="currentColor" opacity="0.62"/>
  </svg>`,
  // Modern Shotgun — double barrel profile, pump foregrip, pistol grip, stock
  'Shotgun': `<svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="7" width="2" height="6" rx="0.4" fill="currentColor"/>
    <rect x="1" y="8" width="14" height="2" rx="0.3" fill="currentColor"/>
    <rect x="1" y="10" width="14" height="2" rx="0.3" fill="currentColor" opacity="0.65"/>
    <rect x="6" y="6" width="6" height="8" rx="1" fill="currentColor" opacity="0.75"/>
    <rect x="11" y="6" width="14" height="8" rx="1" fill="currentColor"/>
    <polygon points="21,14 24,14 23,20 20,20" fill="currentColor"/>
    <rect x="25" y="7" width="9" height="4" rx="0.5" fill="currentColor"/>
    <rect x="31" y="6" width="8" height="6" rx="0.5" fill="currentColor" opacity="0.62"/>
  </svg>`,
  // Modern Pistol — squared slide, ejection port, frame, angled grip, mag base
  'Pistol': `<svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="8" width="11" height="2.5" rx="0.4" fill="currentColor"/>
    <rect x="4" y="5" width="17" height="6" rx="1" fill="currentColor"/>
    <rect x="15" y="6.5" width="4" height="3" rx="0.3" fill="currentColor" opacity="0.28"/>
    <rect x="10" y="11" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.9"/>
    <rect x="10" y="14" width="4" height="2" rx="1" fill="currentColor" opacity="0.38"/>
    <rect x="14" y="13" width="7" height="9" rx="1" fill="currentColor"/>
    <rect x="14" y="22" width="7" height="2" rx="0.5" fill="currentColor" opacity="0.62"/>
  </svg>`,
  // Modern Launcher — shoulder-fired tube, grip, sight, back blast cone
  'Launcher': `<svg width="42" height="18" viewBox="0 0 42 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="0,7 0,11 4,9" fill="currentColor" opacity="0.65"/>
    <rect x="3" y="6" width="27" height="6" rx="2" fill="currentColor"/>
    <polygon points="30,6 30,12 40,9" fill="currentColor" opacity="0.42"/>
    <rect x="40" y="7" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.28"/>
    <rect x="19" y="12" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85"/>
    <rect x="16" y="12" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.48"/>
    <rect x="9" y="4" width="7" height="2" rx="0.5" fill="currentColor" opacity="0.55"/>
  </svg>`,
  // Modern Melee — tactical tanto knife, guard, wrapped handle, pommel
  'Melee': `<svg width="20" height="26" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="9,1 13,1 13,12 16,15 9,15" fill="currentColor"/>
    <polygon points="13,9 16,15 13,15" fill="currentColor" opacity="0.62"/>
    <rect x="7" y="15" width="9" height="2" rx="0.5" fill="currentColor"/>
    <rect x="8" y="17" width="7" height="8" rx="1" fill="currentColor" opacity="0.88"/>
    <rect x="8" y="19" width="7" height="1" rx="0.3" fill="currentColor" opacity="0.38"/>
    <rect x="8" y="22" width="7" height="1" rx="0.3" fill="currentColor" opacity="0.38"/>
    <rect x="8" y="25" width="7" height="1" rx="0.5" fill="currentColor" opacity="0.62"/>
  </svg>`
};

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
                <span style="color:var(--gold-dim);display:inline-flex;align-items:center;
                             margin-right:4px;">${WEAPON_ICONS[w.category] || ''}</span>
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
