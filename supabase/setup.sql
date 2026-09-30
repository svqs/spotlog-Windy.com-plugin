-- Spotlog account sync: run once in Supabase › SQL Editor.
-- One row per user holding their whole diary as JSON. Row-level security makes sure
-- a signed-in user can only ever read or write their own row.

create table if not exists public.spotlog_data (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    data       jsonb       not null,
    updated_at timestamptz not null default now()
);

alter table public.spotlog_data enable row level security;

create policy "spotlog: read own"   on public.spotlog_data for select using (auth.uid() = user_id);
create policy "spotlog: insert own" on public.spotlog_data for insert with check (auth.uid() = user_id);
create policy "spotlog: update own" on public.spotlog_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spotlog: delete own" on public.spotlog_data for delete using (auth.uid() = user_id);
