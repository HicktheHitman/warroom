// js/patchnotes.js
// WARROOM — Live Patch Notes feed

const PATCH_CATS = ['WEAPONS', 'MAPS', 'MODES', 'BUG FIXES'];
let _patchFilter = 'ALL';
let _patchTimer  = null;

async function loadPatchNotesPage() {
  const container = document.getElementById('patchnotes-content');
  if (_patchTimer) { clearInterval(_patchTimer); _patchTimer = null; }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                    letter-spacing:2px;margin-bottom:4px;">PHASE 02 — LIVE GAME</div>
        <div style="font-family:var(--font-mil);font-size:20px;letter-spacing:3px;
                    color:var(--bone);">PATCH NOTES</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="display:flex;align-items:center;gap:5px;font-family:var(--font-mono);
                    font-size:9px;color:var(--olive-glow);letter-spacing:1px;">
          <span class="dot dot-olive blink"></span> LIVE FEED
        </div>
        <div style="font-family:var(--font-mono);font-size:8px;color:var(--bone-dim);"
             id="patch-last-updated"></div>
      </div>
    </div>

    <div id="patch-filter-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem;">
      ${['ALL', ...PATCH_CATS].map(cat => `
        <button onclick="setPatchFilter('${cat}')" data-cat="${cat}"
                style="font-family:var(--font-mono);font-size:8px;padding:4px 10px;
                       letter-spacing:1px;cursor:pointer;border:1px solid;
                       ${cat === _patchFilter
                         ? 'background:var(--gold);color:var(--navy-dark);border-color:var(--gold);'
                         : 'background:transparent;color:var(--bone-dim);border-color:var(--navy-border);'
                       }">${cat}</button>`).join('')}
    </div>

    <div id="patchnotes-list">
      <div style="text-align:center;padding:2rem 0;"><span class="spinner"></span></div>
    </div>`;

  await fetchPatchNotes();
  _patchTimer = setInterval(silentRefreshPatchNotes, 60000);
}

function setPatchFilter(cat) {
  _patchFilter = cat;
  document.querySelectorAll('#patch-filter-bar button').forEach(b => {
    const active = b.dataset.cat === cat;
    b.style.background  = active ? 'var(--gold)'         : 'transparent';
    b.style.color       = active ? 'var(--navy-dark)'    : 'var(--bone-dim)';
    b.style.borderColor = active ? 'var(--gold)'         : 'var(--navy-border)';
  });
  fetchPatchNotes();
}

async function fetchPatchNotes() {
  const { data, error } = await xhrGet(
    'patch_notes', 'select=*&order=patch_date.desc,created_at.desc'
  );
  const container = document.getElementById('patchnotes-list');
  if (!container) return;

  if (error) {
    container.innerHTML = `
      <div class="card"><div style="font-family:var(--font-mono);font-size:10px;
        color:var(--bone-dim);padding:1rem;text-align:center;">
        FAILED TO LOAD PATCH NOTES — CHECK CONNECTION</div></div>`;
    return;
  }

  updatePatchTimestamp();

  let notes = data || [];
  if (_patchFilter !== 'ALL') {
    notes = notes.filter(n => parseCats(n.categories).includes(_patchFilter));
  }

  if (!notes.length) {
    container.innerHTML = `
      <div class="card card-top">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                    padding:1.5rem;text-align:center;letter-spacing:1px;">
          ${_patchFilter === 'ALL'
            ? 'NO PATCH NOTES FILED YET — STANDING BY FOR LAUNCH'
            : `NO ${_patchFilter} UPDATES FOUND`}
        </div>
      </div>`;
    return;
  }

  container.innerHTML = notes.map(n => renderPatchCard(n)).join('');
}

function renderPatchCard(n) {
  const cats = parseCats(n.categories);
  const patchDate = n.patch_date
    ? new Date(n.patch_date + 'T12:00:00').toLocaleDateString('en-US',
        { year:'numeric', month:'short', day:'numeric' }).toUpperCase()
    : 'DATE TBD';

  const catTags = cats.map(c => `
    <span style="font-family:var(--font-mono);font-size:7px;letter-spacing:1px;
                 border:1px solid var(--navy-border);padding:1px 6px;
                 color:var(--bone-dim);">${pnEsc(c)}</span>`).join('');

  return `
    <div class="card" style="margin-bottom:0.75rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="font-family:var(--font-mil);font-size:15px;letter-spacing:2px;
                         color:var(--gold);">${pnEsc(n.version)}</span>
            <span style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                         letter-spacing:1px;">${patchDate}</span>
          </div>
          ${catTags ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${catTags}</div>` : ''}
        </div>
        ${n.source_url ? `
        <a href="${pnEsc(n.source_url)}" target="_blank" rel="noopener"
           style="font-family:var(--font-mono);font-size:8px;letter-spacing:1px;
                  padding:5px 12px;border:1px solid var(--gold-dim);color:var(--gold);
                  white-space:nowrap;text-decoration:none;background:var(--gold-bg);">
          VIEW NOTES ↗
        </a>` : ''}
      </div>
    </div>`;
}

async function silentRefreshPatchNotes() {
  if (currentPage !== 'patchnotes') return;
  const { data, error } = await xhrGet(
    'patch_notes', 'select=*&order=patch_date.desc,created_at.desc'
  );
  if (error || !data) return;

  let filtered = data;
  if (_patchFilter !== 'ALL') {
    filtered = data.filter(n => parseCats(n.categories).includes(_patchFilter));
  }

  const current = document.querySelectorAll('#patchnotes-list .card').length;
  if (filtered.length !== current) {
    document.getElementById('patchnotes-list').innerHTML =
      filtered.map(n => renderPatchCard(n)).join('');
  }
  updatePatchTimestamp();
}

function updatePatchTimestamp() {
  const el = document.getElementById('patch-last-updated');
  if (el) {
    el.textContent = 'SYNC ' + new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }
}

function parseCats(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function pnEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
