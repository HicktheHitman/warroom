// js/countdown.js
// ─────────────────────────────────────────────────────────
// WARROOM — Deployment countdown timer
// Target: October 23, 2026 00:00:00 UTC
// ─────────────────────────────────────────────────────────

const DEPLOYMENT_DATE = new Date('2026-10-23T00:00:00Z');

function renderCountdown(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  function update() {
    const now  = new Date();
    const diff = DEPLOYMENT_DATE - now;

    if (diff <= 0) {
      el.innerHTML = `
        <div class="cd-block">
          <span class="cd-num" style="color: var(--olive-glow); font-size: 14px;">LIVE</span>
          <span class="cd-label">MW4</span>
        </div>`;
      return;
    }

    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    el.innerHTML = `
      <div class="cd-block">
        <span class="cd-num">${days}</span>
        <span class="cd-label">DAYS</span>
      </div>
      <div class="cd-block">
        <span class="cd-num">${String(hours).padStart(2, '0')}</span>
        <span class="cd-label">HRS</span>
      </div>
      <div class="cd-block">
        <span class="cd-num">${String(minutes).padStart(2, '0')}</span>
        <span class="cd-label">MIN</span>
      </div>
      <div class="cd-block">
        <span class="cd-num">${String(seconds).padStart(2, '0')}</span>
        <span class="cd-label">SEC</span>
      </div>`;
  }

  update();
  setInterval(update, 1000);
}
