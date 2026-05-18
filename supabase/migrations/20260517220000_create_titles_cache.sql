create table if not exists public.titles_cache (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null unique,
  tmdb_id integer unique,
  title text not null,
  type text not null check (type in ('movie', 'show')),
  release_year integer,
  genres jsonb,
  overview text,
  runtime integer,
  poster_url text,
  backdrop_url text,
  imdb_id text,
  content_rating text,
  streaming_on jsonb,
  fetched_at timestamptz not null default timezone('utc', now())
);

alter table public.titles_cache enable row level security;

drop policy if exists "titles_cache_read_anon" on public.titles_cache;
create policy "titles_cache_read_anon"
on public.titles_cache
for select
to anon
using (true);

drop policy if exists "titles_cache_no_anon_insert" on public.titles_cache;
create policy "titles_cache_no_anon_insert"
on public.titles_cache
for insert
to anon
with check (false);

drop policy if exists "titles_cache_no_anon_update" on public.titles_cache;
create policy "titles_cache_no_anon_update"
on public.titles_cache
for update
to anon
using (false)
with check (false);

drop policy if exists "titles_cache_no_anon_delete" on public.titles_cache;
create policy "titles_cache_no_anon_delete"
on public.titles_cache
for delete
to anon
using (false);

create index if not exists titles_cache_fetched_at_idx
on public.titles_cache (fetched_at);
