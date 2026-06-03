# WARROOM — Project Structure

## Stack
- Frontend: HTML / Vanilla JS (XHR only, no Supabase client async/await)
- Backend: Supabase (Postgres + Auth + Storage)
- Hosting: Vercel
- Repo: GitHub

## File Tree
```
warroom/
├── index.html              ← Login screen (AUTHENTICATE / REQUEST CLEARANCE)
├── dashboard.html          ← Main app shell (nav + page router)
├── vercel.json             ← Routing + headers config
├── .env.example            ← Env var reference (never commit .env)
│
├── css/
│   ├── base.css            ← CSS variables, resets, typography
│   ├── components.css      ← Buttons, cards, badges, inputs
│   └── layout.css          ← Topbar, grid, page structure
│
├── js/
│   ├── config.js           ← Supabase URL + anon key (from env)
│   ├── auth.js             ← Login, signup, Google OAuth, session, signout
│   ├── xhr.js              ← XHR helper wrapper (GET/POST/PATCH/DELETE)
│   ├── intel.js            ← Confirmed Intel Board reads
│   ├── leaks.js            ← Leak Tracker CRUD + credibility votes
│   ├── votes.js            ← Hype Meter + Weapon prediction votes
│   ├── feed.js             ← Field Reports CRUD + embed parsing
│   ├── fragcast.js         ← FragCast episode feed
│   └── countdown.js        ← Deployment timer logic
│
├── pages/
│   ├── intel.html          ← Intel Feed page partial
│   ├── leaks.html          ← Leak Tracker page partial
│   ├── weapons.html        ← Weapon Prediction DB page partial
│   ├── reports.html        ← Field Reports page partial
│   ├── fragcast.html       ← FragCast page partial
│   └── dossier.html        ← User Dossier (profile) page partial
│
└── admin/
    └── index.html          ← Command panel (admin only, post intel + manage leaks)
```

## Environment Variables
Set in Vercel dashboard + local .env:
- SUPABASE_URL
- SUPABASE_ANON_KEY

## XHR Pattern
All DB calls use XMLHttpRequest via the xhr.js helper.
No Supabase JS client. Direct REST API calls to:
`https://<project>.supabase.co/rest/v1/<table>`

Auth header: `Authorization: Bearer <access_token>`
API key header: `apikey: <anon_key>`
