// js/config.js
// ─────────────────────────────────────────────────────────
// WARROOM — Supabase config
// Set these in your Vercel dashboard under Environment Variables.
// For local dev, replace with your actual values (never commit them).
// ─────────────────────────────────────────────────────────

const WARROOM_CONFIG = {
  supabaseUrl: 'https://yrsjnufuecswkfybdwvk.supabase.co',       // e.g. https://abcdefgh.supabase.co
  supabaseAnonKey: 'sb_publishable_dFYKflaHPMu_RZbf8DpWKA_plitAD-H'
};

// REST API base — all XHR calls hit this
const API_BASE = `${WARROOM_CONFIG.supabaseUrl}/rest/v1`;

// Auth base — login/signup/OAuth
const AUTH_BASE = `${WARROOM_CONFIG.supabaseUrl}/auth/v1`;
