# AGENTS.md — Fast Forward

Project-specific instructions. Global coding standards and git discipline are in `~/.codex/AGENTS.md`.

## What This Project Is
Personal watchlist and recommendation app. Pulls content from Plex (local media server), Max, and Apple TV+ via JustWatch. Claude-powered natural language recommendations. Multi-user in Phase 2 via Plex OAuth.

## File Structure
```text
index.html                        — Vite entry point (do not edit)
netlify.toml                      — build config, env var injection
vite.config.js                    — Vite config (do not edit unless instructed)
package.json                      — dependencies
src/
  main.jsx                        — React boot (do not edit)
  App.jsx                         — top-level routing and layout only
  components/
    Home.jsx                      — main recommendation screen
    Watchlist.jsx                 — watchlist and watched history
    Settings.jsx                  — Plex config, excluded libraries, streaming services
    StatusBar.jsx                 — JustWatch + Plex connection status indicators
    CatalogBrowser.jsx            — browsable grid of available titles
    RecommendationList.jsx        — Claude recommendation results
  hooks/
    useCatalog.js                 — catalog state, JustWatch fetch, Plex fetch, caching
    useWatchlist.js               — watchlist and watched history state
  utils/
    storage.js                    — localStorage read/write helpers
    justwatch.js                  — JustWatch GraphQL fetch + retry logic
    plex.js                       — Plex API fetch + library filtering
    claude.js                     — Anthropic API recommendation call
  styles/
    tokens.css                    — design tokens: colors, spacing, type
    app.css                       — global styles
```

## Architecture
- React + Vite. No other frameworks.
- All state managed via React hooks — no Redux, no Zustand.
- Phase 1: localStorage for persistence. Phase 1.5: Supabase replaces localStorage for cross-device sync.
- JustWatch: unofficial GraphQL API. Weekly cache with 3x retry. Graceful fallback to cache on failure.
- Plex: local network only. Fails gracefully with clear error message when unreachable.
- Claude API: called client-side via Anthropic API for recommendations.
- No backend in Phase 1. Netlify serverless functions introduced in Phase 1.5 for Plex OAuth.

## Component Rules
- No single file should exceed 300 lines. Split into smaller components proactively.
- Each screen (Home, Watchlist, Settings) must be its own component file.
- Shared logic (API calls, storage) goes in utils/ or hooks/ — never inline in components.
- App.jsx handles routing and layout only — no business logic.
- Never jam new features into App.jsx. Always create a new component.

## Streaming Services
Hardcoded to Max (HBO) and Apple TV+ for Phase 1. JustWatch provider IDs:
- Max: `max`
- Apple TV+: `atp`

Adding new services requires updating the `STREAMING_SERVICES` constant in `utils/justwatch.js`.

## Plex Integration
- Connects to local Plex server via `X-Plex-Token` (user-scoped, not server-scoped)
- Only pulls libraries of type `movie` or `show`
- Excluded libraries filtered by name (case-insensitive) — user-configurable in Settings
- Default excluded: Sports, Home Movies, Music, Audiobooks, Live Music, Photos, Plextras
- Fails gracefully when off local network — shows last cached library with clear indicator
- Plex OAuth deferred to Phase 1.5

## JustWatch Caching
- Cache stored in localStorage under `wtw_jw_cache` and `wtw_jw_cache_ts`
- Refresh threshold: 7 days
- On load: auto-refresh if stale, use cache if fresh
- On failure: retry up to 3x with exponential backoff, then fall back to cache
- Never block the UI waiting for JustWatch — load cache immediately, refresh in background

## localStorage Keys
| Key | Contents |
|---|---|
| `wtw_plex_token` | Plex X-Plex-Token |
| `wtw_plex_url` | Plex server URL |
| `wtw_plex_excluded` | Array of excluded library names |
| `wtw_watchlist` | Array of watchlist items |
| `wtw_watched` | Array of watched items |
| `wtw_jw_cache` | JustWatch catalog array |
| `wtw_jw_cache_ts` | JustWatch cache timestamp (ms) |
| `wtw_plex_cache` | Plex library array |

## Phase 1.5 (Supabase)
When Supabase is introduced:
- All localStorage keys above migrate to Supabase tables
- Supabase project will be on the second free-tier account (same as Passports): `tqxvtsdghobustiatiqm`
- A Netlify serverless function will handle Plex OAuth callback
- All RLS policies must be scoped to `authenticated` role — never `public`
- Do not introduce Supabase patterns prematurely in Phase 1

## Env Vars (never hardcode)
Phase 1 has no env vars. Phase 1.5 will add:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Vite requires `VITE_` prefix for client-side vars)

Note: Vite env vars must be prefixed with `VITE_` to be accessible in the browser. Server-side Netlify functions use unprefixed vars.

## Design
- Dark, cinematic aesthetic. Background: `#0a0a0f`. Text: `#e8e4dc`.
- CSS custom properties for all colors — never hardcode hex values in components.
- Font: Georgia serif for display, monospace for metadata and labels.
- No external UI libraries. Raw CSS only.
- Touch targets minimum 44px height.

## Local Dev
`npm run dev` is the correct local workflow. Runs at `localhost:5173`.
No env vars required in Phase 1 — app works out of the box.
Phase 1.5: use a `.env.local` file for Supabase keys (Vite injects automatically).

## Pull Request Drafts
Always open new PRs as drafts (`--draft` flag with `gh pr create`). This prevents CodeRabbit from auto-triggering before work is ready. Only mark ready for review when explicitly instructed.

## Verification
Unless otherwise specified, do not run a local server for final verification. Open a draft PR when instructed — project owner tests on Netlify preview URL.

## General Rules
- Never reference internal service names (JustWatch, Supabase, Anthropic) in user-facing error messages. Use plain language: "Couldn't load streaming catalog. Will retry shortly."
- Never hardcode hex colors — CSS custom properties only.
- Never store the Plex token anywhere other than localStorage — never log it, never include in error messages.
- VERSION bump is mandatory on every PR. Version lives in `src/utils/constants.js` as `APP_VERSION`.
- Keep README.md accurate — update when new env vars, data sources, or major features are added.

## Planned Future Work
- **Phase 1.5**: Supabase for cross-device persistence, Plex OAuth via Netlify function
- **Phase 2**: Multi-user support, per-user watchlists, Plex OAuth per viewer, proper hosted app
- **Trakt/Letterboxd integration**: import watch history
- **Ratings**: user can rate watched titles; factors into future recommendations
- **"Watch together" mode**: shared session for households picking something to watch
- **Additional streaming services**: Netflix, Disney+, Peacock (pending API reliability)
- **Homeboard integration**: surface "tonight's pick" on the household dashboard
