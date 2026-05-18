create extension if not exists pgcrypto;

create table if not exists public.streaming_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  data jsonb not null,
  fetched_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null
);

alter table public.streaming_cache enable row level security;

drop policy if exists "streaming_cache_read_anon" on public.streaming_cache;
create policy "streaming_cache_read_anon"
on public.streaming_cache
for select
to anon
using (true);

drop policy if exists "streaming_cache_no_anon_insert" on public.streaming_cache;
create policy "streaming_cache_no_anon_insert"
on public.streaming_cache
for insert
to anon
with check (false);

drop policy if exists "streaming_cache_no_anon_update" on public.streaming_cache;
create policy "streaming_cache_no_anon_update"
on public.streaming_cache
for update
to anon
using (false)
with check (false);

drop policy if exists "streaming_cache_no_anon_delete" on public.streaming_cache;
create policy "streaming_cache_no_anon_delete"
on public.streaming_cache
for delete
to anon
using (false);

create index if not exists streaming_cache_expires_at_idx
on public.streaming_cache (expires_at);
