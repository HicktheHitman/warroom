// js/tierlist.js
// WARROOM — Weapons Tier List Builder

const TIERS = ['S', 'A', 'B', 'C', 'D'];
const TIER_COLORS = {
  S: { bg: '#3d2e00', border: '#c9a84c',  label: '#c9a84c'  },
  A: { bg: '#3d1f00', border: '#ff8c42',  label: '#ff8c42'  },
  B: { bg: '#1e2e10', border: '#7aad3f',  label: '#7aad3f'  },
  C: { bg: '#1a2030', border: '#8090a8',  label: '#8090a8'  },
  D: { bg: '#2e1010', border: '#c94040',  label: '#c94040'  },
};

let _tlWeapons   = [];
let _tlTierState = {};   // { weaponId: 'S'|'A'|'B'|'C'|'D' }
let _tlView      = 'mine';
let _dragId      = null;

async function loadTierListPage() {
  const container = document.getElementById('tierlist-content');
  _tlView = 'mine';

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    letter-spacing:2px;margin-bottom:4px;">WEAPONS DIVISION</div>
        <div style="font-family:var(--font-mil);font-size:20px;letter-spacing:3px;
                    color:var(--bone);">TIER LIST BUILDER</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button id="tl-btn-mine"      onclick="setTLView('mine')"
                style="${tlBtnStyle(true)}">MY LIST</button>
        <button id="tl-btn-community" onclick="setTLView('community')"
                style="${tlBtnStyle(false)}">COMMUNITY</button>
      </div>
    </div>
    <div id="tierlist-main">
      <div style="text-align:center;padding:2rem;"><span class="spinner"></span></div>
    </div>`;

  const profile = getCachedProfile();
  const weaponsRes = await xhrGet('weapons', 'select=*&order=category.asc,name.asc');

  _tlWeapons   = weaponsRes.data || [];
  _tlTierState = {};

  renderTierBuilder();
}

function setTLView(view) {
  _tlView = view;
  const mine = document.getElementById('tl-btn-mine');
  const comm = document.getElementById('tl-btn-community');
  if (mine) mine.style.cssText = tlBtnStyle(view === 'mine');
  if (comm) comm.style.cssText = tlBtnStyle(view === 'community');
  view === 'mine' ? renderTierBuilder() : renderCommunity();
}

function tlBtnStyle(active) {
  return `font-family:var(--font-mono);font-size:8px;padding:4px 12px;cursor:pointer;
          letter-spacing:1px;border:1px solid;
          ${active
            ? 'background:var(--gold);color:var(--navy-dark);border-color:var(--gold);'
            : 'background:transparent;color:var(--bone-dim);border-color:var(--navy-border);'}`;
}

// ── Builder ───────────────────────────────────────────────

function renderTierBuilder() {
  const main    = document.getElementById('tierlist-main');
  const profile = getCachedProfile();
  const unranked = _tlWeapons.filter(w => !_tlTierState[w.id]);

  main.innerHTML = `
    ${!profile ? `
    <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                text-align:center;padding:0 0 1rem;letter-spacing:1px;">
      <a href="#" onclick="navTo('dossier',null)" style="color:var(--gold);">AUTHENTICATE</a>
      TO SAVE — DRAG AND DROP TO BUILD
    </div>` : ''}

    <div style="margin-bottom:0.75rem;">
      <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);
                  letter-spacing:2px;margin-bottom:5px;">UNRANKED — DRAG TO ASSIGN</div>
      <div id="tl-pool"
           ondragover="tlOver(event)" ondragleave="tlLeave(event)" ondrop="tlDrop(event,null)"
           style="min-height:46px;padding:8px;border:1px dashed var(--navy-border);
                  display:flex;flex-wrap:wrap;gap:6px;transition:border-color 0.15s;">
        ${unranked.length
          ? unranked.map(w => tlChip(w)).join('')
          : `<span style="font-family:var(--font-mono);font-size:9px;color:var(--navy-border);
                          letter-spacing:1px;align-self:center;">ALL WEAPONS RANKED</span>`}
      </div>
    </div>

    ${TIERS.map(tier => {
      const weapons = _tlWeapons.filter(w => _tlTierState[w.id] === tier);
      const c = TIER_COLORS[tier];
      return `
        <div style="display:flex;margin-bottom:5px;min-height:50px;">
          <div style="width:42px;flex-shrink:0;display:flex;align-items:center;
                      justify-content:center;background:${c.bg};
                      border:1px solid ${c.border};
                      font-family:var(--font-mil);font-size:24px;color:${c.label};">
            ${tier}
          </div>
          <div id="tl-tier-${tier}"
               ondragover="tlOver(event)" ondragleave="tlLeave(event)"
               ondrop="tlDrop(event,'${tier}')"
               style="flex:1;padding:6px 8px;border:1px solid var(--navy-border);
                      border-left:none;display:flex;flex-wrap:wrap;gap:6px;
                      align-content:flex-start;min-height:50px;transition:border-color 0.15s;">
            ${weapons.length
              ? weapons.map(w => tlChip(w)).join('')
              : `<span style="font-family:var(--font-mono);font-size:8px;
                              color:var(--navy-border);letter-spacing:1px;align-self:center;">
                   DROP HERE</span>`}
          </div>
        </div>`;
    }).join('')}

    <div style="margin-top:0.75rem;display:flex;justify-content:flex-end;gap:10px;align-items:center;">
      <span id="tl-status" style="font-family:var(--font-mono);font-size:9px;
            color:var(--olive-glow);letter-spacing:1px;"></span>
      ${profile
        ? `<button onclick="loadSavedTierList()"
                   style="font-family:var(--font-mono);font-size:9px;padding:8px 16px;
                          cursor:pointer;border:1px solid var(--navy-border);letter-spacing:1px;
                          background:transparent;color:var(--bone-dim);">
             LOAD SAVED
           </button>
           <button onclick="clearTierList()"
                   style="font-family:var(--font-mono);font-size:9px;padding:8px 16px;
                          cursor:pointer;border:1px solid var(--navy-border);letter-spacing:1px;
                          background:transparent;color:var(--bone-dim);">
             CLEAR LIST
           </button>
           <button id="tl-save-btn" onclick="saveTierList()"
                   style="font-family:var(--font-mono);font-size:9px;padding:8px 20px;
                          cursor:pointer;border:1px solid var(--gold);letter-spacing:1px;
                          background:var(--gold);color:var(--navy-dark);">
             LOCK IN LIST
           </button>`
        : ''}
    </div>`;
}

function tlChip(w) {
  return `<div draggable="true" ondragstart="tlDragStart(event,'${w.id}')"
               style="font-family:var(--font-mono);font-size:9px;letter-spacing:1px;
                      padding:3px 10px;background:var(--navy-border);color:var(--bone);
                      border:1px solid var(--navy-border);cursor:grab;
                      user-select:none;white-space:nowrap;"
               title="${tlEsc(w.category)}">${tlEsc(w.name)}</div>`;
}

// ── Drag handlers ─────────────────────────────────────────

function tlDragStart(e, id) {
  _dragId = id;
  e.dataTransfer.effectAllowed = 'move';
}

function tlOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'var(--gold)';
}

function tlLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.style.borderColor = '';
  }
}

function tlDrop(e, tier) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '';
  if (!_dragId) return;
  if (tier === null) delete _tlTierState[_dragId];
  else _tlTierState[_dragId] = tier;
  _dragId = null;
  renderTierBuilder();
}

// ── Save ──────────────────────────────────────────────────

async function saveTierList() {
  const profile = getCachedProfile();
  if (!profile) return;

  const btn = document.getElementById('tl-save-btn');
  if (btn) { btn.textContent = 'SAVING...'; btn.style.opacity = '0.7'; }

  await xhrDelete('weapon_tier_lists', `user_id=eq.${profile.id}`);

  const rows = Object.entries(_tlTierState)
    .filter(([, t]) => t)
    .map(([weapon_id, tier]) => ({ user_id: profile.id, weapon_id, tier }));

  if (rows.length) {
    const { error } = await xhrPost('weapon_tier_lists', rows);
    if (error) {
      if (btn) { btn.textContent = 'LOCK IN LIST'; btn.style.opacity = '1'; }
      showToast('SAVE FAILED — ' + error, 'error');
      return;
    }
  }

  if (btn) { btn.textContent = 'LOCK IN LIST'; btn.style.opacity = '1'; }
  const statusEl = document.getElementById('tl-status');
  if (statusEl) {
    statusEl.textContent = 'SAVED';
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2500);
  }
  showToast('TIER LIST LOCKED IN', 'success');
}

async function loadSavedTierList() {
  const profile = getCachedProfile();
  if (!profile) return;

  const { data } = await xhrGet('weapon_tier_lists', `select=weapon_id,tier&user_id=eq.${profile.id}`);
  if (!data || !data.length) {
    showToast('NO SAVED LIST FOUND', 'default');
    return;
  }

  _tlTierState = {};
  data.forEach(r => { _tlTierState[r.weapon_id] = r.tier; });
  renderTierBuilder();
  showToast('SAVED LIST LOADED', 'success');
}

function clearTierList() {
  if (!confirm('CLEAR YOUR ENTIRE TIER LIST?')) return;
  _tlTierState = {};
  renderTierBuilder();
}

// ── Community ─────────────────────────────────────────────

async function renderCommunity() {
  const main = document.getElementById('tierlist-main');
  main.innerHTML = `<div style="text-align:center;padding:2rem;"><span class="spinner"></span></div>`;

  const { data, error } = await xhrGet('weapon_tier_lists', 'select=weapon_id,tier');

  if (error || !data || !data.length) {
    main.innerHTML = `
      <div class="card card-top">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1.5rem;text-align:center;letter-spacing:1px;">
          NO COMMUNITY DATA YET — BE THE FIRST TO RANK
        </div>
      </div>`;
    return;
  }

  const SCORE = { S:5, A:4, B:3, C:2, D:1 };
  const agg   = {};
  data.forEach(r => {
    if (!agg[r.weapon_id]) agg[r.weapon_id] = { S:0,A:0,B:0,C:0,D:0,total:0 };
    agg[r.weapon_id][r.tier]++;
    agg[r.weapon_id].total++;
  });

  const weaponMap = Object.fromEntries(_tlWeapons.map(w => [w.id, w]));
  const grouped   = { S:[], A:[], B:[], C:[], D:[] };

  Object.entries(agg).forEach(([weaponId, counts]) => {
    const weapon = weaponMap[weaponId];
    if (!weapon) return;
    const avgScore = TIERS.reduce((s, t) => s + SCORE[t] * counts[t], 0) / counts.total;
    const consensus = TIERS.reduce((best, t) => counts[t] > counts[best] ? t : best, 'S');
    grouped[consensus].push({ weapon, avgScore, votes: counts.total });
  });

  TIERS.forEach(t => grouped[t].sort((a, b) => b.avgScore - a.avgScore));

  const totalVotes = new Set(
    data.map(r => r.weapon_id)   // approximate unique raters via distinct weapons
  ).size;

  main.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                letter-spacing:1px;margin-bottom:0.75rem;">
      COMMUNITY CONSENSUS — ${data.length} TOTAL VOTES
    </div>
    ${TIERS.map(tier => {
      const items = grouped[tier];
      if (!items.length) return '';
      const c = TIER_COLORS[tier];
      return `
        <div style="display:flex;margin-bottom:5px;min-height:50px;">
          <div style="width:42px;flex-shrink:0;display:flex;align-items:center;
                      justify-content:center;background:${c.bg};
                      border:1px solid ${c.border};
                      font-family:var(--font-mil);font-size:24px;color:${c.label};">
            ${tier}
          </div>
          <div style="flex:1;padding:6px 8px;border:1px solid var(--navy-border);
                      border-left:none;display:flex;flex-wrap:wrap;gap:6px;
                      align-content:flex-start;">
            ${items.map(r => `
              <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1px;
                          padding:3px 10px;background:var(--navy-border);color:var(--bone);
                          border:1px solid var(--navy-border);white-space:nowrap;"
                   title="${r.votes} vote${r.votes !== 1 ? 's' : ''}">
                ${tlEsc(r.weapon.name)}
              </div>`).join('')}
          </div>
        </div>`;
    }).join('')}`;
}

// ── Helper ────────────────────────────────────────────────

function tlEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
