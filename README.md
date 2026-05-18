# Fast Forward

Personal watchlist and recommendation app. Plex stays client-side, while the streaming catalog now goes through a Netlify function backed by a 7-day Supabase cache.

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
- The function normalizes the provider response before storing it back in Supabase.

## Files
- `src/utils/streaming.js`: client call to the Netlify function
- `src/utils/supabase.js`: shared browser Supabase client
- `src/hooks/useCatalog.js`: catalog state and streaming load flow
- `netlify/functions/fetch-streaming.js`: cache-first server function
- `supabase/migrations/20260517203000_create_streaming_cache.sql`: table and RLS setup

## Environment Variables
- Browser build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Netlify function: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WATCHMODE_API_KEY`, `RAPIDAPI_KEY`
- Use `.env.example` as the local template.
- Set the Netlify runtime values in the Netlify UI. `netlify.toml` only documents the required names.

## Notes
- Streaming data is no longer cached in `localStorage`.
- Plex settings, watchlist, and watched history still use `localStorage`.
- The function logs when it serves live data so API usage is visible in Netlify logs.
