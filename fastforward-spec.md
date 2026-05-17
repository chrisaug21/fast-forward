# Fast Forward — Product Spec
*Personal media OS for Chris & Bailey. Version 0.3 — May 2026*

---

## What This Is

Fast Forward is a personal watchlist and recommendation app that knows everything you have access to watch, everything you've already seen, and what you're likely to enjoy next. It pulls your Plex library, your streaming services, and your watch history into one place — and uses AI to help you decide what's on tonight.

The problem it solves: every existing solution (JustWatch, Letterboxd, Reelgood) does one thing well. None of them know what you actually own, what you've watched, and what's available to you right now — all at once. Watchlist and playlist features everywhere are bad. Fast Forward fixes that for a household.

---

## Who It's For

Fast Forward is built as a real product with proper auth and logins — both for personal learning, portfolio presentation, and because it's the right way to build things. In practice, the user base is small and invite-only.

**Access model:** Invite code required to sign up. No open registration. Chris controls code generation.

**API-powered features (e.g. Recommendation Engine):** Locked to authorized users only. Users who want AI recommendations must supply their own Anthropic API key in Settings. Chris's key is pre-authorized. This keeps costs controlled if the user base ever expands.

**Current household:** Chris (primary). Bailey added later, once the app is in a well-baked state.

---

## North Star

> *"What should we watch tonight?" answered instantly, accurately, and personally.*

---

## Tech Stack

- **Frontend:** React + Vite
- **Hosting:** Netlify (`fastforward.chrisaug.com`)
- **Backend:** Netlify serverless functions (API proxies, Plex OAuth callback)
- **Database:** Supabase (Phase 1.5+), second free-tier account (`tqxvtsdghobustiatiqm`)
- **Auth:** Supabase Auth with invite code gating (Phase 1.5+)
- **Data sources:** Plex API (via OAuth), Streaming Availability API by Movie of the Night (via RapidAPI), TMDB (free official), Letterboxd (unofficial, opt-in per user)
- **AI:** Anthropic API (proxied via Netlify function, bring-your-own-key) + MCP server (Phase 2+)
- **Repo:** github.com/chrisaug21/fast-forward (personal account)

---

## Product Decisions (Resolved)

**Is this a real product with logins?**
Yes. Proper auth, invite-only signup, per-user data. Built like a product even if the user base stays small. Consistent with Habits, Homeboard, and Passports.

**Recommendation Engine access model:**
Bring-your-own Anthropic API key. Key stored per-user in Supabase (encrypted). Chris's key pre-authorized. Feature disabled for users without a key configured.

**Letterboxd vs Trakt:**
Letterboxd only. Opt-in per user — not all users will have an account.

**Recommendation engine: API vs MCP:**
Both coexist. In-app recommendations use the Anthropic API (proxied, bring-your-own-key). MCP server exposes Fast Forward data to Claude directly for conversational use. Different use cases, not redundant.

**Streaming catalog source:**
Streaming Availability API by Movie of the Night (RapidAPI). Free tier: 500 requests/month. Replaces JustWatch which proved unreliable for server-side use. Genre-filtered to include only: action, adventure, animation, comedy, crime, documentary, drama, family, fantasy, history, horror, music, mystery, romance, scifi, thriller, war, western. Excludes reality, news, talk shows by omission. Rating minimum: 40/100.

**Configurable streaming services:**
Users can add/remove streaming services in Settings. Not hardcoded. Service list stored per-user. Initial defaults: Max (hbo) + Apple TV+ (apple). Additional services (Netflix, Disney+, Peacock, Paramount+) can be added by user.

**Title deduplication (Plex + streaming + physical):**
Deduplicate by TMDB ID. Show one entry per title. If available across multiple sources, display all on the same card (e.g. "Plex · Max · Physical").

**Physical media:**
Users can manually maintain a physical media library (DVDs, Blu-rays, 4K). Manual entry with TMDB title lookup. Stored in Supabase. Included in catalog and recommendations with a "Physical" source tag.

**Adding Bailey:**
Deferred until Phase 3. No rush.

**Plex OAuth priority:**
Phase 1.5 alongside auth. Manual token entry is inconsistent with a product-grade auth experience.

---

## Current State (v0.1 — May 2026)

### Working
- React + Vite app live at `fastforward.chrisaug.com`
- Plex connection via `plex.direct` HTTPS URL (manual token, works remotely)
- Excluded Plex libraries filter (configurable in Settings)
- Streaming catalog: Max + Apple TV+ via Streaming Availability API (Netlify function)
- ~1,300 titles in catalog (900+ Plex, 385 streaming)
- Watchlist + watched history in localStorage
- App.jsx refactored into components
- Branch protection + PR workflow on GitHub

### Known Issues / Debt
- Catalog display capped at 100 titles — no pagination
- Streaming services hardcoded (not yet user-configurable)
- Anthropic recommendation call not yet proxied — broken
- No auth — anyone with the URL can access
- No cross-device persistence — localStorage only
- No visual identity — functional but bland
- No catalog search or sort

---

## Phase 1.5a — UI Foundation
*Goal: make the app actually usable and visually coherent before adding more features*

This phase is intentionally front-loaded before auth/backend work. A usable, good-looking UI makes everything easier to test and build on top of.

### 1. Fix Catalog Display Cap
Remove `slice(0, 100)` limit in CatalogBrowser. Implement virtual scroll or pagination so all 1,300+ titles are accessible without performance issues.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Currently hiding 1,200 titles. Must fix before any meaningful catalog testing.

### 2. Configurable Streaming Services
Move hardcoded Max + Apple TV+ to user-configurable Settings. User can add/remove services from a list of supported options. Stored in localStorage now, Supabase later.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Service IDs mapped to Streaming Availability API catalog IDs. Adding a service triggers a fresh catalog fetch for that service.

### 3. Catalog Filtering + Sorting UI
Add filter controls to CatalogBrowser: filter by source (All / Plex / Streaming / Physical), filter by type (All / Movies / TV), sort by title / year / rating. Search by title.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Makes the catalog actually usable. Required for proper testing.

### 4. Visual Identity
Establish Fast Forward's visual identity. Currently functional but bland. Should feel cinematic, personal, and distinct from the other apps.

**Direction:** Dark, editorial, film-forward. Think: late-night cinema program, not a tech dashboard. Inspired by physical movie posters, film grain, warm tungsten light against dark.

**Design decisions to make:**
- Typography: display font (something with character — slab serif? condensed? italic?) + body font
- Color palette: dark base confirmed, accent color TBD (warm amber? deep red? electric blue?)
- Key UI moments: recommendation cards with poster art, catalog grid, the "what are you in the mood for?" prompt area
- Grain/texture: light film grain overlay already exists — keep and refine
- Motion: subtle, purposeful — nothing flashy

**Scope of this task:**
- Design tokens in `src/styles/tokens.css`
- Typography choices (Google Fonts or system)
- Color palette finalized
- Key components restyled: Home screen, recommendation cards, catalog grid, nav
- Consistent spacing and layout rhythm

- **Complexity:** Medium
- **Risk:** Low
- **Notes:** Do design direction conversation before writing the Codex prompt. This deserves thought, not a rushed pass.

### 5. Recommendation Cards UI
Upgrade recommendation results from plain text list to proper cards. Show: poster image (from Streaming Availability API — already in data), title, year, source(s), runtime, rating, mood tag, reason text. Add to watchlist button on card.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Data is already there, just not displayed. Big perceived quality jump.

### 6. Catalog Grid with Posters
Upgrade CatalogBrowser from text tiles to poster-based grid. Use poster URLs already returned by Streaming Availability API. Fallback to text tile if no poster.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Transforms the catalog from a list into something you actually want to browse.

### 7. Empty States + Loading States
Proper empty states for: no catalog loaded, no watchlist items, no recommendations yet. Proper loading indicators for: Plex fetch, streaming fetch, recommendation call. Currently very bare.
- **Complexity:** Low
- **Risk:** Low

### 8. Error Boundary
Add a React Error Boundary component that catches JS crashes and shows a useful error message instead of a blank white page. One-time fix that permanently solves the "why is it blank" mystery.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Should have done this earlier. Add it now.

### 9. Netlify Function: Anthropic API Proxy
Move Anthropic API call server-side. Client sends catalog + prompt + user's API key to function. Function calls Anthropic, returns recommendations. Key never exposed client-side.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Recommendations are currently broken without this.

---

## Phase 1.5b — Auth & Persistence
*Goal: real auth, real persistence, cross-device sync*

### 10. Supabase Auth + Invite Code Gating
Login/signup via Supabase Auth. Signup requires a valid invite code. No open registration.
- **Complexity:** Medium
- **Risk:** Low
- **Notes:** Same pattern as Habits and Homeboard.

### 11. Plex OAuth
Replace manual token with Plex OAuth flow. Netlify function handles callback. Part of onboarding flow.
- **Complexity:** Medium
- **Risk:** Medium

### 12. Migrate localStorage → Supabase
Move watchlist, watched history, streaming cache, Plex cache, user preferences to Supabase.
- **Complexity:** Medium
- **Risk:** Medium — RLS policies, schema design

### 13. Per-User Anthropic API Key
Settings screen for API key entry. Stored encrypted in Supabase. Recommendation Engine disabled without key.
- **Complexity:** Low
- **Risk:** Low

### 14. Per-User Streaming Services
Streaming service preferences (which services to fetch) stored per-user in Supabase. Syncs across devices.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Extends the localStorage version from Phase 1.5a.

---

## Phase 2 — Core Product
*Goal: build the data layer that makes recommendations meaningful*

### 15. TMDB Metadata Enrichment
Enrich every title with TMDB data: additional metadata, cast, director. TMDB ID becomes the deduplication key across all sources.
- **Complexity:** Medium
- **Risk:** Low — free official API

### 16. Title Deduplication
Cross-reference Plex, streaming, and physical media by TMDB ID. One card per title. Multiple sources on same card.
- **Complexity:** Medium
- **Risk:** Low
- **Notes:** Depends on TMDB enrichment.

### 17. Ratings
After marking something watched, prompt for a rating (1–5 stars). Stored per-user. Feeds recommendation quality.
- **Complexity:** Low
- **Risk:** Low

### 18. Plex Watch History Import
Pull play history from Plex API to seed watched list. One-time import + ongoing sync.
- **Complexity:** Medium
- **Risk:** Low

### 19. Letterboxd Import (Opt-in)
Import watch history and ratings from Letterboxd. Opt-in per user.
- **Complexity:** Medium
- **Risk:** Medium — unofficial API

### 20. Physical Media Library
Manual entry for DVDs, Blu-rays, 4K. TMDB title lookup. Included in catalog and recommendations.
- **Complexity:** Low
- **Risk:** Low

### 21. Playlist / Curated Lists
User-created ordered lists with name and description. The feature that's missing everywhere.
- **Complexity:** Medium
- **Risk:** Low

### 22. MCP Server
Expose Fast Forward data to Claude via MCP. Conversational recommendations via Claude subscription.
- **Complexity:** High
- **Risk:** Medium

---

## Phase 3 — Household & Social

### 23. Add Bailey as User
Invite Bailey via invite code. Her own watchlist, watched history, ratings, Plex connection.
- **Complexity:** Low
- **Risk:** Low

### 24. "Watch Together" Mode
Recommendations factor in both users' history and ratings.
- **Complexity:** Medium
- **Risk:** Medium

### 25. Per-User Taste Profiles
Aggregate ratings + watch history per user. Feeds Watch Together and solo recommendations.
- **Complexity:** Medium
- **Risk:** Low

### 26. "Leaving Soon" Alerts
Titles leaving your services in the next 30 days. Streaming Availability API has this data via the Changes endpoint.
- **Complexity:** Medium
- **Risk:** Low — Changes endpoint is part of the API we already use

### 27. New to Your Services
Filter for recently added titles. Surfaces what's new without checking manually.
- **Complexity:** Medium
- **Risk:** Low

### 28. Public List Sharing
Read-only share link for any playlist or watchlist. No login required for viewer.
- **Complexity:** Medium
- **Risk:** Low

---

## Phase 4 — Polish & Intelligence

### 29. Mood Wheel
Visual grid of moods: Dark / Funny / Romantic / Mindless / Epic / Short / Foreign / Comfort.
- **Complexity:** Low
- **Risk:** Low

### 30. "Spin It"
One-tap random pick from watchlist.
- **Complexity:** Low
- **Risk:** Low

### 31. Session Planning
"I have 90 minutes" → recommends titles that fit. Uses runtime data.
- **Complexity:** Medium
- **Risk:** Low

### 32. "The Pile" View
Everything in Plex you've never watched, sorted by how long it's been sitting there.
- **Complexity:** Low
- **Risk:** Low

### 33. Smart Re-watch Suggestions
"You watched this 4 years ago, Bailey hasn't seen it."
- **Complexity:** Medium
- **Risk:** Medium

### 34. Mobile-Optimized UI
Responsive layout, touch-friendly.
- **Complexity:** Medium
- **Risk:** Low

### 35. Homeboard Integration
Surface "tonight's pick" on household dashboard. One tile, updated daily.
- **Complexity:** Low
- **Risk:** Low

### 36. Trailer Links
Link to TMDB video / YouTube trailer for any title.
- **Complexity:** Low
- **Risk:** Low

### 37. Watch Party Scheduling
"Let's watch this Friday" → adds to both users' Google Calendars.
- **Complexity:** Medium
- **Risk:** Low

### 38. CSV / JSON Export
Full watch history and ratings export.
- **Complexity:** Low
- **Risk:** Low

### 39. Veto Mode
Bailey gets one veto per night. Logged. Tracked. Displayed.
- **Complexity:** Low
- **Risk:** High (relationship)

---

## Unscheduled / Future Ideas

- Apple TV ratings import
- Webhook on "watched" → Make.com automation
- Disagreement score — how often Chris and Bailey agree. Pure data.
- "Bailey would like this" tag
- Re-watch detector
- Watch streak
- Fast Forward for other media (books, podcasts?)
- Self-hosted API

---

## Supabase Schema (Draft — Phase 1.5b)

### `users` (extends Supabase Auth)
- `display_name`
- `plex_token` (encrypted)
- `plex_url`
- `anthropic_api_key` (encrypted, nullable)
- `letterboxd_username` (nullable)
- `streaming_services` (array of service IDs, e.g. ["hbo", "apple"])

### `invite_codes`
- `id`, `code`, `created_by`, `used_by` (nullable), `used_at` (nullable), `expires_at` (nullable)

### `watchlist_items`
- `id`, `user_id`, `tmdb_id`, `title`, `type` (movie/show), `sources` (array), `added_at`

### `watched_items`
- `id`, `user_id`, `tmdb_id`, `title`, `type`, `watched_at`, `rating` (1–5, nullable)

### `physical_media`
- `id`, `user_id`, `tmdb_id`, `title`, `type`, `format` (dvd/bluray/4k), `added_at`

### `streaming_cache`
- `id`, `user_id`, `catalog` (JSONB), `fetched_at`, `services` (array)

### `plex_cache`
- `id`, `user_id`, `catalog` (JSONB), `fetched_at`

### `playlists`
- `id`, `user_id`, `name`, `description`, `is_public`, `created_at`

### `playlist_items`
- `id`, `playlist_id`, `tmdb_id`, `sort_order`, `added_at`

---

## Priority Order (Next Session)

1. Fix catalog display cap (remove 100-title limit, add pagination)
2. Configurable streaming services in Settings
3. Catalog filtering + sorting UI
4. Visual identity — design direction conversation first, then build
5. Recommendation cards with posters
6. Catalog grid with posters
7. Empty states + loading states
8. Error Boundary
9. Netlify function: Anthropic proxy (fixes broken recommendations)
10. Supabase auth + invite codes
11. Plex OAuth
12. Migrate localStorage → Supabase
13. Per-user Anthropic API key
14. Per-user streaming services (Supabase)

---

## Streaming Availability API Reference

**Base URL (RapidAPI):** `https://streaming-availability.p.rapidapi.com`
**Auth header:** `X-RapidAPI-Key`
**Free tier:** 500 requests/month

**Service IDs:**
- Max: `hbo`
- Apple TV+: `apple`
- Netflix: `netflix`
- Disney+: `disney`
- Peacock: `peacock`
- Paramount+: `paramount`
- Prime Video: `prime`

**Genre IDs (verified):**
`action`, `adventure`, `animation`, `comedy`, `crime`, `documentary`, `drama`, `family`, `fantasy`, `history`, `horror`, `music`, `mystery`, `romance`, `scifi`, `thriller`, `war`, `western`

**Key params for catalog fetch:**
- `country=us`
- `catalogs=[service_id]`
- `show_type=movie` or `show_type=series`
- `series_granularity=show` (always — doubles items per page for series)
- `order_by=popularity_1year`
- `rating_min=40`
- `genres=[comma-separated ids]`
- `genres_relation=or`
- `show_original_language=en`
- `cursor=[nextCursor]` for pagination

**Items per page:** 20 for movies, 20 for series with `series_granularity=show`
**Pagination:** follow `nextCursor` until `hasMore=false`
**Current cap:** 5 pages per call (= ~100 titles per service/type combo, ~400 total)
