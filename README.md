# Fast Forward

Fast Forward is a personal "what should we watch?" app for a mixed catalog.
It combines:

- streaming titles from Max and Apple TV+
- local Plex library titles
- Claude-powered recommendations

The app is built with React and Vite. Plex stays client-side. The streaming
catalog is fetched server-side through Netlify Functions so API keys stay out
of the browser.

## What It Does

- loads a streaming catalog for supported services
- loads movie and TV libraries from Plex
- lets you browse the combined catalog
- lets you save titles to a watchlist
- asks Claude for recommendations based on mood, history, and what is actually available

## Current Streaming Pipeline

The streaming side now has two server-side cache layers:

1. `streaming_cache`
   Stores the upstream normalized streaming catalog for 7 days, split by service.

2. `titles_cache`
   Stores TMDB-enriched metadata for individual titles so poster, genre,
   runtime, and rating data can be reused for 30 days.

The flow is:

1. The browser calls `/.netlify/functions/fetch-streaming`.
2. `fetch-streaming` checks `public.streaming_cache` separately for Max and Apple TV+.
3. If a service cache is fresh, it reuses that service's source titles instead of hitting Watchmode.
4. If a service cache is stale, it refreshes that service from Watchmode with throttled page requests.
5. If Watchmode fails for one service, stale cached titles for that service are returned instead of failing the whole catalog.
6. The per-service source catalogs are merged after refresh/cache checks finish.
7. On every request, it checks `public.titles_cache` before building the response.
8. Fresh TMDB records are reused immediately.
9. Stale or missing TMDB records are re-enriched independently of the weekly source cache.
10. It enriches up to 150 titles per invocation with TMDB metadata.
11. It filters excluded genres after enrichment.
12. It stores refreshed title metadata in `titles_cache`.
13. It returns the filtered catalog to the browser.

## TMDB Enrichment Rules

- TMDB runs only on the server
- `TMDB_API_KEY` is never sent to the browser
- max 150 titles are enriched per `fetch-streaming` run
- a 100ms delay is added between TMDB requests
- cached TMDB metadata is considered stale after 30 days
- unmatched TMDB titles are still kept in the catalog with null metadata
- genre filtering happens after enrichment so bad source genre data does not drive filtering

Excluded genres:

- Reality
- Game Show
- Talk
- News
- Sport
- Kids
- Documentary
- Family, unless the title also includes Animation

## Tech Stack

- React 19
- Vite
- Netlify Functions
- Supabase
- Plex API
- Anthropic API
- Watchmode
- TMDB

## Project Structure

```text
src/
  components/
    CatalogBrowser.jsx            main catalog browser shell
    CatalogBrowserCard.jsx        individual catalog card UI
    CatalogBrowserFilters.jsx     catalog filter controls
    Home.jsx                      recommendation screen
    Settings.jsx                  Plex and app settings
    StatusBar.jsx                 connection and cache status
    Watchlist.jsx                 saved and watched items
  hooks/
    useCatalog.js                 streaming + Plex catalog state
    useWatchlist.js               watchlist state
  utils/
    claude.js                     recommendation request helper
    constants.js                  version and shared constants
    plex.js                       Plex fetch + normalize helpers
    storage.js                    localStorage helpers
    streaming.js                  browser call to fetch-streaming
    supabase.js                   browser Supabase client

netlify/functions/
  fetch-streaming.js              main streaming catalog function
  enrich-titles.js                direct TMDB enrichment endpoint
  tmdb-enrichment.js              TMDB lookup + mapping helpers
  title-cache.js                  titles_cache read/write helpers
  source-cache.js                 per-service streaming cache helpers
  source-catalog.js               per-service Watchmode refresh orchestration
  catalog-filter.js               post-enrichment genre filtering
  streaming-normalize.js          source response normalization
  streaming-sources.js            Watchmode source fetchers

supabase/migrations/
  20260517203000_create_streaming_cache.sql
  20260517220000_create_titles_cache.sql
```

## Environment Variables

Browser build variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Netlify function variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WATCHMODE_API_KEY`
- `RAPIDAPI_KEY`
- `TMDB_API_KEY`

Use [`.env.example`](/Users/chrisaugustine/projects/fast-forward/fast-forward/.env.example)
as the starting template for local work.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Lint the code:

```bash
npm run lint
```

## Supabase Setup

This app expects the cache tables to exist in Supabase.

Apply the migrations in `supabase/migrations/` using your normal Supabase workflow.

Important tables:

- `public.streaming_cache`
- `public.titles_cache`

RLS behavior:

- anon read is allowed
- anon writes are blocked
- server-side writes use the service role key from the Netlify function

## Important Product Constraints

- Plex auth stays in `localStorage`
- Plex token must never be logged or exposed in errors
- no auth, Plex, or watchlist behavior should be changed casually while working on streaming
- keep files under 300 lines where possible
- bump the app version before any push that changes shipped code

## What Is Still Missing

- a user setting to include documentaries
- a title detail view for overview/synopsis
- broader streaming provider coverage
- multi-user support
- hosted Plex OAuth flow

## Verification Checklist

After a change that affects streaming:

1. Run `npm run lint`.
2. Run `npm run build`.
3. Confirm `fetch-streaming` returns items.
4. Confirm posters, genres, runtime, and content ratings render in the catalog when present.
5. Check Netlify logs for cache hits, live fetches, filtered title counts, and any TMDB cap warnings.
