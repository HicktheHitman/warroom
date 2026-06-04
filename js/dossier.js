// js/dossier.js
// ─────────────────────────────────────────────────────────
// WARROOM — Dossier (profile) page
// Shows: callsign, role badge, join date, post count,
//        leak submissions, recent field reports, edit callsign
// ─────────────────────────────────────────────────────────

async function loadDossierPage() {
  const container = document.getElementById('dossier-content');
  container.innerHTML = `<div style="padding:2rem 0;text-align:center;">
    <span class="spinner"></span></div>`;

  const session = getSession();
  if (!session) return;

  // Load profile + counts in parallel
  const [profileRes, reportsRes, leaksRes] = await Promise.all([
    xhrGet('profiles', 'select=*&limit=1'),
    xhrGet('field_reports', `select=id&user_id=eq.${getCachedProfile()?.id || 'none'}`),
    xhrGet('leaks', `select=id&submitted_by=eq.${getCachedProfile()?.id || 'none'}`)
  ]);

  const profile      = profileRes.data?.[0];
  const reportCount  = reportsRes.data?.length || 0;
  const leakCount    = leaksRes.data?.length   || 0;

  if (!profile) {
    container.innerHTML = `<div class="card card-top">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-dim);
                  padding:1rem;text-align:center;">PROFILE NOT FOUND</div></div>`;
    return;
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const roleBadge = profile.role === 'admin'   ? '<span class="badge badge-command">COMMAND</span>'
                  : profile.role === 'command'  ? '<span class="badge badge-command">COMMAND</span>'
                  : '<span class="badge badge-operative">OPERATIVE</span>';

  container.innerHTML = `
    <div class="grid-2-1" style="align-items:start;">

      <!-- Left: Profile card -->
      <div>
        <div class="card card-top" style="margin-bottom:1rem;">
          <div class="card-header">
            <div class="card-title">DOSSIER</div>
            ${roleBadge}
          </div>

          <!-- Callsign display -->
          <div style="padding:1rem 0;border-bottom:1px solid var(--navy-border);margin-bottom:1rem;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                        letter-spacing:2px;margin-bottom:6px;">OPERATIVE DESIGNATION</div>
            <div style="font-family:var(--font-mil);font-size:28px;font-weight:900;
                        color:var(--gold-bright);letter-spacing:3px;" id="dossier-callsign">
              ${profile.callsign}
            </div>
          </div>

          <!-- Stats row -->
          <div style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
            <div class="dossier-stat">
              <div class="dossier-stat-num">${reportCount}</div>
              <div class="dossier-stat-label">FIELD REPORTS</div>
            </div>
            <div class="dossier-stat">
              <div class="dossier-stat-num">${leakCount}</div>
              <div class="dossier-stat-label">LEAKS FILED</div>
            </div>
            <div class="dossier-stat">
              <div class="dossier-stat-num" style="font-size:11px;">${joinDate}</div>
              <div class="dossier-stat-label">ENLISTED</div>
            </div>
          </div>

          <!-- Edit callsign -->
          <div style="border-top:1px solid var(--navy-border);padding-top:1rem;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--bone-dim);
                        letter-spacing:2px;margin-bottom:8px;">UPDATE CALLSIGN</div>
            <div class="error-msg" id="dossier-error"></div>
            <div class="success-msg" id="dossier-success"
                 style="display:none;font-family:var(--font-mono);font-size:10px;
                        color:var(--olive-glow);letter-spacing:1px;margin-bottom:8px;
                        padding:6px 8px;background:var(--olive-bg);
                        border:1px solid var(--olive);"></div>
            <div style="display:flex;gap:8px;">
              <input class="mil-input" type="text" id="callsign-edit-input"
                     value="${profile.callsign}" maxlength="24" autocomplete="off"
                     style="flex:1;"
                     oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9_\\-]/g,'')">
              <button class="btn btn-primary" id="btn-save-callsign"
                      onclick="saveCallsignEdit()" style="white-space:nowrap;">
                SAVE
              </button>
            </div>
          </div>
        </div>

        <!-- Sign out -->
        <button class="btn btn-danger btn-full" onclick="handleSignOut()">
          GO DARK — SIGN OUT
        </button>
      </div>

      <!-- Right: Activity summary -->
      <div>
        <div class="card card-top-olive">
          <div class="card-header">
            <div class="card-title">INTEL CLEARANCE</div>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--olive-glow);">✓</span>
            <span>READ CONFIRMED INTEL</span>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--olive-glow);">✓</span>
            <span>SUBMIT LEAK REPORTS</span>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--olive-glow);">✓</span>
            <span>VOTE ON CREDIBILITY</span>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--olive-glow);">✓</span>
            <span>POST FIELD REPORTS</span>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--olive-glow);">✓</span>
            <span>WEAPON PREDICTIONS</span>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--bone-dim);">◻</span>
            <span style="color:var(--bone-dim);">OPERATIVE TIER [PHASE 3]</span>
          </div>
          <div class="dossier-clearance-item">
            <span style="color:var(--bone-dim);">◻</span>
            <span style="color:var(--bone-dim);">COMMANDER TIER [PHASE 3]</span>
          </div>
        </div>
      </div>

    </div>`;
}

// ── Save callsign edit ────────────────────────────────────

async function saveCallsignEdit() {
  const input  = document.getElementById('callsign-edit-input');
  const errEl  = document.getElementById('dossier-error');
  const sucEl  = document.getElementById('dossier-success');
  const btn    = document.getElementById('btn-save-callsign');
  const newCs  = input.value.trim().toUpperCase();

  errEl.classList.remove('visible');
  sucEl.style.display = 'none';

  if (!newCs || newCs.length < 3) {
    errEl.textContent = 'MINIMUM 3 CHARACTERS';
    errEl.classList.add('visible');
    return;
  }

  setButtonLoading(btn, '...');
  const { error } = await updateCallsign(newCs);
  resetButton(btn, 'SAVE');

  if (error) {
    errEl.textContent = error;
    errEl.classList.add('visible');
    return;
  }

  // Update topbar + dossier display
  document.getElementById('topbar-callsign').textContent = newCs;
  document.getElementById('dossier-callsign').textContent = newCs;
  sucEl.textContent = `CALLSIGN UPDATED TO ${newCs}`;
  sucEl.style.display = 'block';

  // Reload profile cache
  currentUser = await fetchCurrentUser();
}
