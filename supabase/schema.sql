-- ============================================================
-- IPL Fantasy League — Supabase Schema
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. PROFILES TABLE
-- ──────────────────────────────────────────────
create table public.profiles (
  id             uuid references auth.users on delete cascade primary key,
  name           text not null,
  email          text not null,
  avatar_url     text,
  is_approved    boolean default false,
  -- Login streak
  login_streak   integer default 0,
  last_login_date date,
  -- Voting streak (consecutive days with a correct prediction)
  voting_streak          integer default 0,
  last_correct_vote_date date,
  created_at     timestamp with time zone default now(),
  updated_at     timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Anyone authenticated can read profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ──────────────────────────────────────────────
-- 2. MATCHES TABLE  (synced from CricAPI)
-- ──────────────────────────────────────────────
create table public.matches (
  id             text primary key,        -- CricAPI match ID
  name           text,
  team1          text not null,
  team2          text not null,
  venue          text,
  match_date     timestamp with time zone not null,
  status         text,                    -- Raw status string from CricAPI
  winner         text,                    -- Team name of winner, null until ended
  match_started  boolean default false,
  match_ended    boolean default false,
  raw_data       jsonb,
  last_synced    timestamp with time zone default now()
);

alter table public.matches enable row level security;

create policy "Authenticated users can view matches"
  on public.matches for select
  using (auth.role() = 'authenticated');

-- Service role (used by sync API route) can do everything
create policy "Service role can manage matches"
  on public.matches for all
  using (auth.role() = 'service_role');

-- ──────────────────────────────────────────────
-- 3. PREDICTIONS TABLE
-- ──────────────────────────────────────────────
create table public.predictions (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  match_id       text references public.matches(id) on delete cascade not null,
  predicted_team text not null,
  is_correct     boolean,                 -- null until match ends
  created_at     timestamp with time zone default now(),
  updated_at     timestamp with time zone default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;

-- Everyone can see everyone's predictions (that's the social feature)
create policy "Authenticated users can view all predictions"
  on public.predictions for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own prediction"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own prediction"
  on public.predictions for update
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 4. LEADERBOARD VIEW
-- ──────────────────────────────────────────────
create or replace view public.leaderboard as
select
  p.id,
  p.name,
  p.avatar_url,
  p.voting_streak,
  p.login_streak,
  count(pr.id) filter (where pr.is_correct = true)  as correct_predictions,
  count(pr.id) filter (where pr.is_correct is not null) as total_predictions
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
where p.is_approved = true
group by p.id, p.name, p.avatar_url, p.voting_streak, p.login_streak
order by correct_predictions desc;

-- ──────────────────────────────────────────────
-- 5. HELPER FUNCTIONS
-- ──────────────────────────────────────────────

-- Update login streak on login
create or replace function update_login_streak(p_user_id uuid)
returns void as $$
declare
  rec record;
  today date := current_date;
begin
  select * into rec from public.profiles where id = p_user_id;
  if rec.last_login_date = today then
    return; -- already counted today
  elsif rec.last_login_date = today - interval '1 day' then
    update public.profiles
    set login_streak = coalesce(login_streak, 0) + 1,
        last_login_date = today, updated_at = now()
    where id = p_user_id;
  else
    update public.profiles
    set login_streak = 1,
        last_login_date = today, updated_at = now()
    where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- Update voting streak when a correct prediction is recorded
create or replace function update_voting_streak(p_user_id uuid, match_day date)
returns void as $$
declare
  rec record;
begin
  select * into rec from public.profiles where id = p_user_id;
  if rec.last_correct_vote_date = match_day then
    return; -- already counted this day
  elsif rec.last_correct_vote_date = match_day - interval '1 day' then
    update public.profiles
    set voting_streak = coalesce(voting_streak, 0) + 1,
        last_correct_vote_date = match_day, updated_at = now()
    where id = p_user_id;
  else
    -- streak broken or first correct vote
    update public.profiles
    set voting_streak = 1,
        last_correct_vote_date = match_day, updated_at = now()
    where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;
