// js/config.js
// ─────────────────────────────────────────────────────────
// WARROOM — Supabase config
// Set these in your Vercel dashboard under Environment Variables.
// For local dev, replace with your actual values (never commit them).
// ─────────────────────────────────────────────────────────

const WARROOM_CONFIG = {
  supabaseUrl: 'https://yrsjnufuecswkfybdwvk.supabase.co',       // e.g. https://abcdefgh.supabase.co
  supabaseAnonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlyc2pudWZ1ZWNzd2tmeWJkd3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDgwNjYsImV4cCI6MjA5NjA4NDA2Nn0.vKm2_OmA1WNmjX9ne7T5pe0a0dmaqIhZguee6vn2_hs'
};

// REST API base — all XHR calls hit this
const API_BASE = `${WARROOM_CONFIG.supabaseUrl}/rest/v1`;

// Auth base — login/signup/OAuth
const AUTH_BASE = `${WARROOM_CONFIG.supabaseUrl}/auth/v1`;
