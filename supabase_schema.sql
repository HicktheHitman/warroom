-- ═══════════════════════════════════════════════════════════════
-- WARROOM — SUPABASE SCHEMA
-- Phase 1 (Pre-Launch: Now → October 23, 2026)
--
-- HOW TO USE:
--   1. Go to your Supabase project dashboard
--   2. Open the SQL Editor (left sidebar)
--   3. Paste this entire file and click RUN
--   4. Verify tables appear in Table Editor
-- ═══════════════════════════════════════════════════════════════


-- ─── EXTENSION ───────────────────────────────────────────────
-- UUID generation
create extension if not exists "uuid-ossp";


-- ─── PROFILES ────────────────────────────────────────────────
-- One row per user. Created automatically on signup via trigger.
-- "callsign" is the WARROOM username (unique, shown everywhere).

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  callsign    text unique not null,
  avatar_url  text,
  role        text not null default 'operative',  -- operative | command | admin
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, callsign)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'callsign',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ─── INTEL POSTS ─────────────────────────────────────────────
-- Admin-only. Verified MW4 facts shown on the Confirmed Intel Board.
-- status: confirmed | urgent (triggers red alert banner)

create table intel_posts (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  body        text,
  source_name text,            -- e.g. "Activision.com"
  source_url  text,
  status      text not null default 'confirmed',  -- confirmed | urgent
  posted_by   uuid references profiles(id),
  created_at  timestamptz not null default now()
);


-- ─── LEAKS ───────────────────────────────────────────────────
-- Community-submitted leaks. Credibility is calculated from votes.
-- state: unconfirmed | confirmed | debunked (set by admin)

create table leaks (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  body            text,
  source_hint     text,          -- e.g. "data mine", "insider"
  state           text not null default 'unconfirmed',  -- unconfirmed | confirmed | debunked
  credibility_pct integer not null default 50,          -- 0-100, updated by vote tallies
  submitted_by    uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- One vote per user per leak
create table leak_votes (
  id         uuid primary key default uuid_generate_v4(),
  leak_id    uuid not null references leaks(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  vote       smallint not null check (vote in (1, -1)),  -- 1 = credible, -1 = not credible
  created_at timestamptz not null default now(),
  unique (leak_id, user_id)
);

-- Auto-recalculate credibility_pct after each vote
create or replace function recalc_credibility()
returns trigger language plpgsql as $$
declare
  ups   integer;
  downs integer;
  total integer;
begin
  select
    count(*) filter (where vote = 1),
    count(*) filter (where vote = -1)
  into ups, downs
  from leak_votes
  where leak_id = coalesce(new.leak_id, old.leak_id);

  total := ups + downs;

  update leaks
  set credibility_pct = case when total = 0 then 50 else round((ups::numeric / total) * 100) end
  where id = coalesce(new.leak_id, old.leak_id);

  return new;
end;
$$;

create trigger after_leak_vote
  after insert or update or delete on leak_votes
  for each row execute procedure recalc_credibility();


-- ─── HYPE METER ──────────────────────────────────────────────
-- Community-wide hype score (0-100). One vote per user.
-- Score = average of all votes.

create table hype_votes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  score      smallint not null check (score between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id)  -- one vote per user, can update
);


-- ─── WEAPONS ─────────────────────────────────────────────────
-- Weapon prediction database. Admin seeds weapon names/types.
-- Community votes on whether each will appear in MW4.

create table weapons (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null unique,
  category     text not null,   -- AR | SMG | LMG | Sniper | Shotgun | Pistol | Launcher | Melee
  weapon_type  text not null default 'returning',  -- returning | new
  created_at   timestamptz not null default now()
);

-- One vote per user per weapon
create table weapon_votes (
  id         uuid primary key default uuid_generate_v4(),
  weapon_id  uuid not null references weapons(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  vote       smallint not null check (vote in (1, -1)),  -- 1 = predict it's in, -1 = predict it's out
  created_at timestamptz not null default now(),
  unique (weapon_id, user_id)
);


-- ─── FIELD REPORTS (SOCIAL FEED) ─────────────────────────────
-- User posts. Text + optional embed URL (YouTube / TikTok / X).
-- flagged = reported by community, hidden from feed until reviewed.

create table field_reports (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  body        text not null,
  embed_url   text,            -- YouTube, TikTok, Twitter/X link
  embed_type  text,            -- youtube | tiktok | twitter | null
  flagged     boolean not null default false,
  created_at  timestamptz not null default now()
);


-- ─── FRAGCAST EPISODES ───────────────────────────────────────
-- Admin-managed. One row per episode.
-- embed_url: direct podcast link or YouTube embed.

create table fragcast_episodes (
  id          uuid primary key default uuid_generate_v4(),
  episode_num integer not null unique,
  title       text not null,
  description text,
  duration    text,             -- e.g. "1h 14m"
  embed_url   text,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Lock down every table. Anon users can only READ public content.
-- Auth users can insert their own rows. Admins can do everything.
-- ═══════════════════════════════════════════════════════════════

alter table profiles          enable row level security;
alter table intel_posts        enable row level security;
alter table leaks              enable row level security;
alter table leak_votes         enable row level security;
alter table hype_votes         enable row level security;
alter table weapons            enable row level security;
alter table weapon_votes       enable row level security;
alter table field_reports      enable row level security;
alter table fragcast_episodes  enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── profiles ──
create policy "Anyone can read profiles"        on profiles for select using (true);
create policy "Users can update own profile"    on profiles for update using (auth.uid() = id);

-- ── intel_posts ──
create policy "Anyone can read intel"           on intel_posts for select using (true);
create policy "Admins can insert intel"         on intel_posts for insert with check (is_admin());
create policy "Admins can update intel"         on intel_posts for update using (is_admin());
create policy "Admins can delete intel"         on intel_posts for delete using (is_admin());

-- ── leaks ──
create policy "Anyone can read leaks"           on leaks for select using (true);
create policy "Auth users can submit leaks"     on leaks for insert with check (auth.uid() is not null);
create policy "Admins can update leak state"    on leaks for update using (is_admin());

-- ── leak_votes ──
create policy "Anyone can read leak votes"      on leak_votes for select using (true);
create policy "Auth users can vote on leaks"    on leak_votes for insert with check (auth.uid() = user_id);
create policy "Users can change own leak vote"  on leak_votes for update using (auth.uid() = user_id);
create policy "Users can remove own leak vote"  on leak_votes for delete using (auth.uid() = user_id);

-- ── hype_votes ──
create policy "Anyone can read hype votes"      on hype_votes for select using (true);
create policy "Auth users can vote hype"        on hype_votes for insert with check (auth.uid() = user_id);
create policy "Users can update own hype vote"  on hype_votes for update using (auth.uid() = user_id);

-- ── weapons ──
create policy "Anyone can read weapons"         on weapons for select using (true);
create policy "Admins can manage weapons"       on weapons for all using (is_admin());

-- ── weapon_votes ──
create policy "Anyone can read weapon votes"    on weapon_votes for select using (true);
create policy "Auth users can vote weapons"     on weapon_votes for insert with check (auth.uid() = user_id);
create policy "Users can change weapon vote"    on weapon_votes for update using (auth.uid() = user_id);
create policy "Users can remove weapon vote"    on weapon_votes for delete using (auth.uid() = user_id);

-- ── field_reports ──
create policy "Anyone can read unflagged posts" on field_reports for select using (flagged = false);
create policy "Auth users can post reports"     on field_reports for insert with check (auth.uid() = user_id);
create policy "Users can delete own reports"    on field_reports for delete using (auth.uid() = user_id);
create policy "Admins can manage all reports"   on field_reports for all using (is_admin());

-- ── fragcast_episodes ──
create policy "Anyone can read episodes"        on fragcast_episodes for select using (true);
create policy "Admins can manage episodes"      on fragcast_episodes for all using (is_admin());


-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Weapons list (admin can add more later)
-- ═══════════════════════════════════════════════════════════════

insert into weapons (name, category, weapon_type) values
  ('M4A1',        'AR',      'returning'),
  ('TAQ-56',      'AR',      'returning'),
  ('STB-556',     'AR',      'new'),
  ('M13B',        'AR',      'returning'),
  ('Kastov 762',  'AR',      'returning'),
  ('VAZNEV-9K',   'SMG',     'returning'),
  ('Fennec 45',   'SMG',     'returning'),
  ('HRM-9',       'SMG',     'new'),
  ('Lachmann Sub','SMG',     'returning'),
  ('PDSW 528',    'SMG',     'returning'),
  ('RPK',         'LMG',     'returning'),
  ('RAAL MG',     'LMG',     'returning'),
  ('MCPR-300',    'Sniper',  'returning'),
  ('Signal 50',   'Sniper',  'returning'),
  ('LA-B 330',    'Sniper',  'returning'),
  ('Lockwood 300','Shotgun',  'returning'),
  ('Bryson 800',  'Shotgun',  'returning'),
  ('X13 Auto',    'Pistol',   'returning'),
  ('P890',        'Pistol',   'returning'),
  ('RPG-7',       'Launcher', 'returning'),
  ('Riot Shield', 'Melee',    'returning');


-- ═══════════════════════════════════════════════════════════════
-- USEFUL VIEWS (optional but handy for the dashboard)
-- ═══════════════════════════════════════════════════════════════

-- Weapons with vote tallies
create or replace view weapon_vote_summary as
select
  w.id,
  w.name,
  w.category,
  w.weapon_type,
  count(v.id) filter (where v.vote = 1)  as votes_in,
  count(v.id) filter (where v.vote = -1) as votes_out,
  count(v.id) as total_votes,
  case
    when count(v.id) = 0 then 50
    else round((count(v.id) filter (where v.vote = 1)::numeric / count(v.id)) * 100)
  end as predict_pct
from weapons w
left join weapon_votes v on v.weapon_id = w.id
group by w.id, w.name, w.category, w.weapon_type
order by predict_pct desc;

-- Hype score aggregate
create or replace view hype_aggregate as
select
  count(*)                        as total_votes,
  coalesce(round(avg(score)), 0)  as hype_score
from hype_votes;

-- Field reports with author callsign
create or replace view field_reports_with_author as
select
  r.id,
  r.body,
  r.embed_url,
  r.embed_type,
  r.created_at,
  p.callsign,
  p.avatar_url,
  p.role
from field_reports r
join profiles p on p.id = r.user_id
where r.flagged = false
order by r.created_at desc;


-- ═══════════════════════════════════════════════════════════════
-- DONE
-- Tables: profiles, intel_posts, leaks, leak_votes, hype_votes,
--         weapons, weapon_votes, field_reports, fragcast_episodes
-- Views:  weapon_vote_summary, hype_aggregate, field_reports_with_author
-- ═══════════════════════════════════════════════════════════════
