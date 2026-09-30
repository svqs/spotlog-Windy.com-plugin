-- Spotlog sync: run once in Supabase › SQL Editor.
-- One row per Windy user holding their whole diary as JSON. Only the Edge Function (service role)
-- can read or write it: row-level security is on and there are no public policies.

create table if not exists public.spotlog_diary (
    windy_user_id bigint primary key,
    data          jsonb       not null,
    updated_at    timestamptz not null default now(),
    constraint spotlog_diary_size check (octet_length(data::text) < 10485760)
);

alter table public.spotlog_diary enable row level security;
-- (no policies on purpose: the anon/public key can't touch this table)
