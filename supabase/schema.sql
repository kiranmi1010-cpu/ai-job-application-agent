-- JobPilot cloud sync: one row per user holding their synced data.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.jobpilot_snapshots (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.jobpilot_snapshots enable row level security;

-- Each signed-in user can only see and change their own row.
drop policy if exists "own snapshot select" on public.jobpilot_snapshots;
drop policy if exists "own snapshot insert" on public.jobpilot_snapshots;
drop policy if exists "own snapshot update" on public.jobpilot_snapshots;
drop policy if exists "own snapshot delete" on public.jobpilot_snapshots;

create policy "own snapshot select" on public.jobpilot_snapshots
  for select using (auth.uid() = user_id);
create policy "own snapshot insert" on public.jobpilot_snapshots
  for insert with check (auth.uid() = user_id);
create policy "own snapshot update" on public.jobpilot_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own snapshot delete" on public.jobpilot_snapshots
  for delete using (auth.uid() = user_id);
