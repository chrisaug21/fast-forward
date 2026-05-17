# Fast Forward

Personal watchlist and AI-powered recommendation app. Pulls content from Plex (local media server), Max, and Apple TV+ via JustWatch. Claude recommends what to watch based on mood, history, and available catalog.

## Stack
- React + Vite — component-based UI, local dev at `localhost:5173`
- Anthropic API — Claude-powered recommendations (client-side)
- JustWatch unofficial GraphQL API — streaming catalog (Max, Apple TV+)
- Plex API — local media server library (movies + TV only)
- localStorage — Phase 1 persistence
- Supabase — Phase 1.5 cross-device persistence (not yet implemented)
- Netlify — hosting, build via `npm run build`, publish dir `dist`

## File Structure
```text
index.html
netlify.toml
vite.config.js
src/
  main.jsx                  — React boot, do not edit
  App.jsx                   — routing and layout only
  components/
    Home.jsx                — recommendation screen
    Watchlist.jsx           — watchlist + watched history
    Settings.jsx            — Plex config, excluded libraries
    StatusBar.jsx           — connection status indicators
    CatalogBrowser.jsx      — browsable title grid
    RecommendationList.jsx  — Claude results display
  hooks/
    useCatalog.js           — catalog state + fetch logic
    useWatchlist.js         — watchlist + watched history
  utils/
    storage.js              — localStorage helpers
    justwatch.js            — JustWatch fetch + retry + cache
    plex.js                 — Plex API + library filtering
    claude.js               — Anthropic API call
    constants.js            — APP_VERSION, keys, enums
  styles/
    tokens.css              — design tokens
    app.css                 — global styles
```

## Component Rules
- No single file over 300 lines — split proactively
- Each screen is its own component
- Business logic in utils/ or hooks/ only — never inline in components
- App.jsx is layout/routing only — never add features here

## Data Sources
**JustWatch** — unofficial GraphQL API
- Providers: Max (`max`), Apple TV+ (`atp`)
- Weekly cache in localStorage with 3x retry + exponential backoff
- Falls back to cache on failure — never blocks UI

**Plex** — local network only
- Auth: `X-Plex-Token` (user-scoped)
- Only pulls `movie` and `show` library types
- Excluded libraries filtered by name (case-insensitive, user-configurable)
- Default excluded: Sports, Home Movies, Music, Audiobooks, Live Music, Photos, Plextras
- Fails gracefully when off local network

**Claude API** — client-side recommendation call
- Model: claude-sonnet-4-20250514
- Takes catalog + watchlist + watched history + user prompt
- Returns structured JSON of recommendations from available catalog only

## localStorage Keys
| Key | Contents |
|---|---|
| `wtw_plex_token` | Plex auth token |
| `wtw_plex_url` | Plex server base URL |
| `wtw_plex_excluded` | Excluded library names array |
| `wtw_watchlist` | Watchlist items array |
| `wtw_watched` | Watched history array |
| `wtw_jw_cache` | JustWatch catalog array |
| `wtw_jw_cache_ts` | JustWatch cache timestamp |
| `wtw_plex_cache` | Plex library cache array |

## Design Tokens
- Background: `#0a0a0f` (near black)
- Surface: `#0c0c16`
- Text: `#e8e4dc` (warm off-white)
- Muted text: `#666` / `#555` / `#444`
- Accent blue: `#9090c0`
- Accent amber: `#c09060`
- Success: `#608060`
- Error: `#8b2020`
- Font: Georgia serif (display), monospace (labels/metadata)
- Never hardcode hex — CSS custom properties only

## Key Rules
- Never reference JustWatch, Supabase, or Anthropic in user-facing errors
- Never log or expose the Plex token
- Never hardcode colors — CSS custom properties only
- VERSION bump mandatory before every single push, no matter how small — lives in `src/utils/constants.js` as `APP_VERSION`, and `package.json` must match it
- Never push first and bump later — the pushed build must always display the latest version for testing
- No single file over 300 lines

## Phase 1.5 (Supabase — not yet)
- localStorage keys migrate to Supabase tables
- Supabase project: second free-tier account (`tqxvtsdghobustiatiqm`)
- Netlify function handles Plex OAuth callback
- Vite env vars must be prefixed `VITE_` for client-side access
- Do not introduce Supabase patterns before Phase 1.5 begins

## Env Vars
Phase 1: none required.
Phase 1.5 will add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Local Dev
`npm run dev` — runs at `localhost:5173`. No env vars needed in Phase 1.

## Pull Request Drafts
Always open as drafts (`--draft`). Only mark ready when explicitly instructed.

## Verification
Open draft PR when instructed. Project owner tests on Netlify preview URL — do not rely on local server for final verification.

## Planned Future Work
- **Phase 1.5**: Supabase persistence, Plex OAuth
- **Phase 2**: Multi-user, per-user watchlists, hosted app at watch.chrisaug.com
- **Ratings**: user rates watched titles; informs future recommendations
- **Trakt/Letterboxd**: import watch history
- **Watch together mode**: household shared session
- **More streaming services**: Netflix, Disney+, Peacock
- **Homeboard integration**: surface tonight's pick on household dashboard
