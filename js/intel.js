// js/intel.js
// ─────────────────────────────────────────────────────────
// WARROOM — Intel Feed page
// Reads intel_posts table. Renders countdown + confirmed
// intel board + hype meter. Built in Step 3.
// ─────────────────────────────────────────────────────────

async function loadIntelPage() {
  const container = document.getElementById('intel-content');

  // Render deployment banner with countdown immediately
  container.innerHTML = `
    <div class="deployment-banner">
      <div>
        <div class="deploy-label">STATUS // PRE-DEPLOYMENT</div>
        <div class="deploy-title">TIME TO DEPLOYMENT: MW4</div>
      </div>
      <div class="countdown" id="countdown-display"></div>
    </div>
    <div id="intel-alerts"></div>
    <div class="grid-2" style="margin-bottom: 1rem;">
      <div id="intel-confirmed-wrap"></div>
      <div id="intel-leaks-preview-wrap"></div>
    </div>
    <div id="intel-hype-wrap"></div>
  `;

  renderCountdown('countdown-display');

  // TODO Step 3: load intel posts and hype meter from Supabase
  document.getElementById('intel-confirmed-wrap').innerHTML = `
    <div class="card card-top">
      <div class="card-header">
        <div class="card-title">CONFIRMED INTEL</div>
        <div class="dot dot-gold"></div>
      </div>
      <div style="font-family: var(--font-mono); font-size: 10px; color: var(--bone-dim);
                  padding: 1rem 0; text-align: center; letter-spacing: 1px;">
        CONNECT SUPABASE TO LOAD INTEL
      </div>
    </div>`;
}
