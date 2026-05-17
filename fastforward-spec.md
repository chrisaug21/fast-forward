# Fast Forward — Product Spec
*Personal media OS for Chris & Bailey. Version 0.2 — May 2026*

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
- **Data sources:** Plex API (via OAuth), JustWatch (unofficial GraphQL), TMDB (free official), Letterboxd (unofficial, opt-in per user)
- **AI:** Anthropic API (proxied via Netlify function, bring-your-own-key) + MCP server (Phase 2+)
- **Repo:** github.com/chrisaug21/fast-forward (personal account)

---

## Product Decisions (Resolved)

**Is this a real product with logins?**
Yes. Proper auth, invite-only signup, per-user data. Built like a product even if the user base stays small. Consistent with Habits, Homeboard, and Passports.

**Recommendation Engine access model:**
Bring-your-own Anthropic API key. Key stored per-user in Supabase (encrypted). Chris's key pre-authorized. Feature disabled for users without a key configured. This keeps AI costs controlled if the app ever expands beyond a handful of users.

**Letterboxd vs Trakt:**
Letterboxd only. Chris uses and likes it. Trakt not pursued. Letterboxd import is opt-in per user — not all users will have an account.

**Recommendation engine: API vs MCP:**
Both coexist. In-app recommendations use the Anthropic API (proxied, bring-your-own-key). MCP server exposes Fast Forward data to Claude directly for conversational use. Different use cases, not redundant.

**Letterboxd connection:**
Opt-in per user. Not assumed. Bailey does not currently have a Letterboxd account — not relevant until she's added as a user.

**Title deduplication (Plex + streaming + physical):**
Deduplicate by TMDB ID. Show one entry per title. If available across multiple sources, display all on the same card (e.g. "Plex · Max · Physical"). No duplicates in catalog or recommendations.

**Physical media:**
Users can manually maintain a physical media library (DVDs, Blu-rays, 4K). Manual entry with TMDB title lookup. Stored in Supabase. Included in catalog and recommendations with a "Physical" source tag. Deduplicated against Plex and streaming via TMDB ID.

**Adding Bailey:**
Deferred until the app is in a well-baked state — Phase 3. No rush.

**Plex OAuth priority:**
Moved up to Phase 1.5 alongside auth. Manual token entry is inconsistent with a product-grade auth experience. Users should connect Plex via OAuth as part of onboarding — not by pasting a token into Settings.

---

## Current State (v0.1 — May 2026)

### Working
- Plex connection via `plex.direct` HTTPS URL (manual token, works remotely)
- Excluded Plex libraries filter (configurable in Settings)
- Watchlist + watched history (localStorage, browser-local only)
- Live at `fastforward.chrisaug.com`

### Broken / Needs Netlify Functions
- JustWatch fetch fails — CORS issue, needs server-side proxy
- Anthropic recommendation call fails — needs server-side proxy + API key handling

### Known Debt
- No auth — anyone with the URL can access
- No cross-device persistence — localStorage only
- `App.jsx` is 820+ lines, needs component refactor before more feature work

---

## Phase 1.5 — Fix the Foundation
*Goal: get the core loop working reliably, add real auth and persistence*

### 1. App.jsx Component Refactor
Split 820-line App.jsx into components per AGENTS.md structure. Do this first, before any other work.
- **Complexity:** Low
- **Risk:** Low
- **Target structure:** Home, Watchlist, Settings, StatusBar, CatalogBrowser, RecommendationList, hooks/, utils/

### 2. Netlify Function: JustWatch Proxy
Proxy JustWatch GraphQL requests server-side to eliminate CORS issues. Weekly cache + 3x retry stays client-side.
- **Complexity:** Low
- **Risk:** Low

### 3. Netlify Function: Anthropic API Proxy
Client sends catalog + prompt + user's API key to function. Function calls Anthropic, returns recommendations. Key never exposed client-side beyond the user's own session.
- **Complexity:** Low
- **Risk:** Low

### 4. Supabase Auth + Invite Code Gating
Login/signup via Supabase Auth. Signup requires a valid invite code. Chris controls code generation. No open registration.
- **Complexity:** Medium
- **Risk:** Low
- **Notes:** Same auth pattern as Habits and Homeboard. Invite code validated server-side at signup.

### 5. Plex OAuth
Replace manual token with Plex OAuth flow. Netlify function handles callback and stores token in Supabase per user. Part of onboarding — users connect Plex right after signing up.
- **Complexity:** Medium
- **Risk:** Medium — OAuth flow, secure token storage
- **Notes:** Moved up because manual token entry is inconsistent with a product-grade auth experience.

### 6. Migrate localStorage → Supabase
Move watchlist, watched history, JustWatch cache, and Plex cache to Supabase tables. Cross-device sync unlocked.
- **Complexity:** Medium
- **Risk:** Medium — RLS policies, schema design
- **Notes:** Do after auth is stable. See schema draft below.

### 7. Per-User Anthropic API Key
Settings screen lets users add their own Anthropic API key. Stored encrypted in Supabase. Recommendation Engine disabled without a key. Chris's key pre-authorized at the account level.
- **Complexity:** Low
- **Risk:** Low

---

## Phase 2 — Core Product
*Goal: build the data layer that makes recommendations meaningful*

### 8. TMDB Metadata Enrichment
Enrich every title with TMDB data: poster, cast, director, runtime, genres, scores. Required for deduplication and a usable catalog UI.
- **Complexity:** Medium
- **Risk:** Low — free official API, well documented
- **Notes:** Do early in Phase 2. TMDB ID becomes the deduplication key across all sources.

### 9. Title Deduplication
Cross-reference Plex, streaming, and physical media by TMDB ID. One card per title. Multiple sources shown on the same card.
- **Complexity:** Medium
- **Risk:** Low
- **Notes:** Depends on TMDB enrichment being in place first.

### 10. Ratings
After marking something watched, prompt for a rating (1–5 stars). Stored per-user. Surfaces in watched history and feeds recommendation quality.
- **Complexity:** Low
- **Risk:** Low

### 11. Plex Watch History Import
Pull play history from Plex API to seed watched list automatically. One-time import + ongoing sync.
- **Complexity:** Medium
- **Risk:** Low

### 12. Letterboxd Import (Opt-in)
Import watch history, ratings, and diary from Letterboxd. Opt-in per user — users connect their username in Settings. Not assumed for all users.
- **Complexity:** Medium
- **Risk:** Medium — unofficial API, data mapping

### 13. Physical Media Library
Manual entry for DVDs, Blu-rays, and 4K discs not in Plex. TMDB title lookup. Stored in Supabase. Included in catalog and recommendations with a "Physical" source tag. Deduplicated via TMDB ID.
- **Complexity:** Low
- **Risk:** Low

### 14. Playlist / Curated Lists
User-created ordered lists with a name and description. e.g. "Directors I'm Working Through," "Date Night Queue," "To Watch With Bailey."
- **Complexity:** Medium
- **Risk:** Low
- **Notes:** This is the feature that's missing everywhere. Make it good.

### 15. Better Recommendation UI
Show poster (TMDB), all source(s), runtime, score alongside each recommendation. Add mood tags. Feels like a real product.
- **Complexity:** Low
- **Risk:** Low
- **Notes:** Depends on TMDB enrichment.

### 16. MCP Server
Expose Fast Forward data (watchlist, ratings, watched history, available catalog) to Claude via MCP. Allows conversational recommendations using Claude subscription — no API cost.
- **Complexity:** High
- **Risk:** Medium — new territory, well-documented protocol
- **Notes:** Once Supabase is the data layer, MCP is essentially an API wrapper. The data layer is the hard part, not the MCP itself.

---

## Phase 3 — Household & Social
*Goal: add Bailey, make it work for a household*

### 17. Add Bailey as User
Invite Bailey via invite code once the app is well-baked. Her own watchlist, watched history, ratings, and Plex connection.
- **Complexity:** Low
- **Risk:** Low — auth and multi-user already in place by this point

### 18. "Watch Together" Mode
Recommendations factor in both users' history and ratings. Surfaces titles neither has seen that both would likely enjoy.
- **Complexity:** Medium
- **Risk:** Medium — overlap scoring is hard to do well

### 19. Per-User Taste Profiles
Aggregate ratings + watch history into a taste profile per user. Feeds Watch Together mode and improves solo recommendations over time.
- **Complexity:** Medium
- **Risk:** Low

### 20. "Leaving Soon" Alerts
Titles leaving your streaming services in the next 30 days. JustWatch has this data. "Watch this before it's gone."
- **Complexity:** Medium
- **Risk:** Medium — needs polling, JustWatch data reliability

### 21. New to Your Services
Filter for titles recently added to your streaming services. Surfaces what's new without checking manually.
- **Complexity:** Medium
- **Risk:** Low

### 22. Public List Sharing
Read-only share link for any playlist or watchlist. No login required for viewer. Same pattern as Passports public share.
- **Complexity:** Medium
- **Risk:** Low

### 23. Additional Streaming Services
Add Netflix, Disney+, Peacock, Paramount+ to JustWatch pull. Only add services the user actually subscribes to — configurable per user in Settings.
- **Complexity:** Low
- **Risk:** Low

---

## Phase 4 — Polish & Intelligence

### 24. Mood Wheel
Visual grid of moods instead of a text prompt: Dark / Funny / Romantic / Mindless / Epic / Short / Foreign / Comfort. Tapping one fires a structured recommendation prompt.
- **Complexity:** Low
- **Risk:** Low

### 25. "Spin It"
One-tap random pick from your watchlist. For when you cannot decide.
- **Complexity:** Low
- **Risk:** Low

### 26. Session Planning
"I have 90 minutes" → recommends titles that fit the time window. Uses TMDB runtime data.
- **Complexity:** Medium
- **Risk:** Low

### 27. "The Pile" View
Everything in Plex you've never watched, sorted by how long it's been sitting there. Guilt-driven UX.
- **Complexity:** Low
- **Risk:** Low

### 28. Smart Re-watch Suggestions
"You watched this 4 years ago, Bailey hasn't seen it." Surfaces titles worth revisiting or sharing.
- **Complexity:** Medium
- **Risk:** Medium — needs solid watch history data first

### 29. Mobile-Optimized UI
Responsive layout, touch-friendly. Works well on phone.
- **Complexity:** Medium
- **Risk:** Low

### 30. Homeboard Integration
Surface "tonight's pick" on the household dashboard. One tile, updated daily.
- **Complexity:** Low
- **Risk:** Low

### 31. Trailer Links
Link to YouTube trailer or TMDB video for any title. One tap to preview before deciding.
- **Complexity:** Low
- **Risk:** Low

### 32. Watch Party Scheduling
"Let's watch this Friday" → adds to both users' Google Calendars.
- **Complexity:** Medium
- **Risk:** Low

### 33. CSV / JSON Export
Full watch history and ratings export. Your data, yours to keep.
- **Complexity:** Low
- **Risk:** Low

### 34. Veto Mode
Bailey gets one veto per night. Logged. Tracked. Displayed.
- **Complexity:** Low
- **Risk:** High (relationship)

---

## Unscheduled / Future Ideas

- **Apple TV ratings import** — seeds taste data without manual entry
- **Webhook on "watched"** — trigger Make.com automations when a title is marked watched
- **Disagreement score** — how often Chris and Bailey agree on what to watch. Pure data, no purpose.
- **"Bailey would like this" tag** — household-aware recommendation tagging
- **Re-watch detector** — flags watchlist items you've already seen via history cross-reference
- **Watch streak** — days in a row you've watched something. Silly but sticky.
- **Fast Forward for other media** — books (Goodreads?), podcasts?
- **Self-hosted API** — expose your Fast Forward data for other tools to consume

---

## Supabase Schema (Draft — Phase 1.5)

### `users` (extends Supabase Auth)
- `display_name`
- `plex_token` (encrypted)
- `plex_url`
- `anthropic_api_key` (encrypted, nullable — required for Recommendation Engine)
- `letterboxd_username` (nullable, opt-in per user)

### `invite_codes`
- `id`, `code`, `created_by`, `used_by` (nullable), `used_at` (nullable), `expires_at` (nullable)

### `watchlist_items`
- `id`, `user_id`, `tmdb_id`, `title`, `type` (movie/show), `sources` (array: plex/max/apple/physical), `added_at`

### `watched_items`
- `id`, `user_id`, `tmdb_id`, `title`, `type`, `watched_at`, `rating` (1–5, nullable)

### `physical_media`
- `id`, `user_id`, `tmdb_id`, `title`, `type`, `format` (dvd/bluray/4k), `added_at`

### `jw_cache`
- `id`, `user_id`, `catalog` (JSONB), `fetched_at`, `services` (array)

### `plex_cache`
- `id`, `user_id`, `catalog` (JSONB), `fetched_at`

### `playlists`
- `id`, `user_id`, `name`, `description`, `is_public`, `created_at`

### `playlist_items`
- `id`, `playlist_id`, `tmdb_id`, `sort_order`, `added_at`

---

## Recommended Priority Order (Next 90 Days)

1. App.jsx component refactor — before anything else
2. Netlify function: JustWatch proxy — unblocks core loop
3. Netlify function: Anthropic proxy — unblocks recommendations
4. Supabase auth + invite code gating — unlocks everything else
5. Plex OAuth — consistent with product-grade auth, part of onboarding
6. Migrate localStorage → Supabase — cross-device sync
7. Per-user Anthropic API key — locks down AI feature properly
8. TMDB metadata enrichment — big UI quality jump for low effort
9. Title deduplication — depends on TMDB
10. Ratings — needed for recommendations to improve
11. Plex watch history import — seeds real data
12. Letterboxd import — best external taste signal
13. Physical media library — completes the catalog picture
14. Playlist / curated lists — the missing feature everywhere
15. "Watch Together" mode — core household use case
16. MCP server — Claude integration via subscription
