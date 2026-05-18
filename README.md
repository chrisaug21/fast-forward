# Fast Forward

Personal watchlist and recommendation app. Plex stays client-side, while the streaming catalog now goes through Netlify functions backed by Supabase caches and TMDB metadata enrichment.

## Stack
- React + Vite
- Netlify Functions
- Supabase
- Plex API
- Anthropic API

## Streaming Catalog Flow
- The browser calls `/.netlify/functions/fetch-streaming`.
- The function checks `public.streaming_cache` in Supabase first.
- If the cache is fresh, it returns cached data and does not call any upstream API.
- If the cache is stale or missing, it tries Watchmode first and falls back to RapidAPI Streaming Availability only if Watchmode fails.
- The function enriches up to 50 titles per run with TMDB metadata, filters excluded genres, and stores the final catalog back in Supabase.
- The function also checks `public.titles_cache` so TMDB metadata can be reused for 30 days before re-enrichment.

## Files
- `src/utils/streaming.js`: client call to the Netlify function
- `src/utils/supabase.js`: shared browser Supabase client
- `src/hooks/useCatalog.js`: catalog state and streaming load flow
- `netlify/functions/fetch-streaming.js`: cache-first server function
- `netlify/functions/enrich-titles.js`: TMDB enrichment function
- `netlify/functions/tmdb-enrichment.js`: shared TMDB request + mapping helpers
- `supabase/migrations/20260517203000_create_streaming_cache.sql`: table and RLS setup
- `supabase/migrations/20260517220000_create_titles_cache.sql`: enriched title metadata cache

## Environment Variables
- Browser build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Netlify function: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WATCHMODE_API_KEY`, `RAPIDAPI_KEY`, `TMDB_API_KEY`
- Use `.env.example` as the local template.
- Set the Netlify runtime values in the Netlify UI. `netlify.toml` only documents the required names.

## Notes
- Streaming data is no longer cached in `localStorage`.
- Genre filtering now happens after TMDB enrichment so the client only sees the filtered catalog.
- Plex settings, watchlist, and watched history still use `localStorage`.
- The function logs when it serves live data so API usage is visible in Netlify logs.
