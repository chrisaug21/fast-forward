import { useState, useEffect, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLEX_TOKEN_KEY = "wtw_plex_token";
const PLEX_URL_KEY = "wtw_plex_url";
const WATCHLIST_KEY = "wtw_watchlist";
const WATCHED_KEY = "wtw_watched";
const JW_CACHE_KEY = "wtw_jw_cache";
const JW_CACHE_TS_KEY = "wtw_jw_cache_ts";
const PLEX_CACHE_KEY = "wtw_plex_cache";
const PLEX_EXCLUDED_KEY = "wtw_plex_excluded";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Library names to always exclude from Plex (matched case-insensitively)
const DEFAULT_EXCLUDED_LIBRARIES = ["Sports", "Home Movies", "Music", "Audiobooks", "Live Music", "Photos", "Plextras"];

const STREAMING_SERVICES = [
  { id: "hbo", jwId: "max", label: "Max (HBO)" },
  { id: "apple", jwId: "atp", label: "Apple TV+" },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
const store = {
  get: (k, fallback = null) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── JustWatch fetcher ────────────────────────────────────────────────────────
async function fetchJustWatch(retries = 3) {
  const CORS_PROXY = "https://corsproxy.io/?";
  const services = STREAMING_SERVICES.map(s => s.jwId);

  // JustWatch GraphQL endpoint (unofficial but stable)
  const query = `
    query GetPopularTitles($providers: [String!]!) {
      popularTitles(
        country: "US"
        first: 500
        filter: { packages: $providers }
      ) {
        edges {
          node {
            id
            objectType
            content(country: "US", language: "en") {
              title
              fullPath
              posterUrl
              genres { shortName }
              runtime
              scoring { imdbScore imdbCount }
              releaseYear
              shortDescription
            }
            offers(country: "US", platform: WEB) {
              package { clearName technicalName }
              standardWebURL
            }
          }
        }
      }
    }
  `;

  const url = `${CORS_PROXY}https://apis.justwatch.com/graphql`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { providers: services } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const edges = data?.data?.popularTitles?.edges || [];

      return edges.map(({ node }) => {
        const c = node.content;
        const relevantOffers = (node.offers || []).filter(o =>
          services.includes(o.package?.technicalName)
        );
        const streamingOn = [...new Set(
          relevantOffers.map(o => {
            const svc = STREAMING_SERVICES.find(s => s.jwId === o.package?.technicalName);
            return svc ? svc.label : o.package?.clearName;
          })
        )];
        return {
          id: node.id,
          title: c?.title || "Unknown",
          type: node.objectType === "SHOW" ? "TV Show" : "Movie",
          genres: (c?.genres || []).map(g => g.shortName),
          runtime: c?.runtime,
          imdbScore: c?.scoring?.imdbScore,
          releaseYear: c?.releaseYear,
          description: c?.shortDescription || "",
          posterUrl: c?.posterUrl ? `https://images.justwatch.com${c.posterUrl.replace("{profile}", "s332")}` : null,
          streamingOn,
          source: "streaming",
        };
      }).filter(t => t.streamingOn.length > 0);
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

// ─── Plex fetcher ─────────────────────────────────────────────────────────────
async function fetchPlexLibrary(plexUrl, plexToken, excludedLibraries = DEFAULT_EXCLUDED_LIBRARIES) {
  const base = plexUrl.replace(/\/$/, "");
  const headers = { "X-Plex-Token": plexToken, Accept: "application/json" };

  const libRes = await fetch(`${base}/library/sections?X-Plex-Token=${plexToken}`, { headers });
  if (!libRes.ok) throw new Error("Cannot reach Plex. Are you on your local network?");
  const libData = await libRes.json();
  const sections = libData?.MediaContainer?.Directory || [];

  const excludedLower = excludedLibraries.map(e => e.toLowerCase());
  const mediaSections = sections.filter(s =>
    ["movie", "show"].includes(s.type) &&
    !excludedLower.includes((s.title || "").toLowerCase())
  );
  const allItems = [];

  for (const section of mediaSections) {
    const res = await fetch(`${base}/library/sections/${section.key}/all?X-Plex-Token=${plexToken}`, { headers });
    if (!res.ok) continue;
    const data = await res.json();
    const items = data?.MediaContainer?.Metadata || [];
    items.forEach(item => {
      allItems.push({
        id: `plex-${item.ratingKey}`,
        title: item.title,
        type: section.type === "movie" ? "Movie" : "TV Show",
        genres: (item.Genre || []).map(g => g.tag),
        runtime: item.duration ? Math.round(item.duration / 60000) : null,
        imdbScore: item.rating,
        releaseYear: item.year,
        description: item.summary || "",
        posterUrl: item.thumb ? `${base}${item.thumb}?X-Plex-Token=${plexToken}` : null,
        streamingOn: ["Plex (Local)"],
        source: "plex",
      });
    });
  }
  return allItems;
}

// ─── Claude recommender ───────────────────────────────────────────────────────
async function getRecommendations({ prompt, catalog, watchlist, watched }) {
  const catalogSummary = catalog.slice(0, 300).map(t =>
    `- "${t.title}" (${t.type}, ${t.releaseYear || "?"}, ${t.streamingOn.join("/")}, IMDb: ${t.imdbScore || "?"}, Genres: ${t.genres.slice(0,3).join(", ")})`
  ).join("\n");

  const watchedTitles = watched.map(w => w.title).join(", ") || "none yet";
  const watchlistTitles = watchlist.map(w => w.title).join(", ") || "none yet";

  const systemPrompt = `You are a personalized movie and TV recommendation assistant. You have access to the user's available content catalog spanning their Plex library and streaming services.

Available catalog (${catalog.length} titles total, showing sample):
${catalogSummary}

User's watchlist: ${watchlistTitles}
User's watched history: ${watchedTitles}

Return ONLY valid JSON. No markdown fences, no preamble. Format:
{
  "recommendations": [
    {
      "title": "exact title from catalog",
      "reason": "2-3 sentence personalized reason",
      "where": "streaming service or Plex (Local)",
      "mood": "one-word mood tag"
    }
  ],
  "message": "brief friendly intro (1 sentence)"
}

Rules:
- Only recommend titles that exist EXACTLY in the catalog
- Give 5-8 recommendations
- Vary sources (mix Plex and streaming when possible)
- Factor in watched history (don't repeat those)
- Be specific and personalized in reasons`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt || "What should I watch tonight?" }],
    }),
  });

  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function WhatToWatch() {
  const [screen, setScreen] = useState("home"); // home | settings | watchlist
  const [plexToken, setPlexToken] = useState(() => store.get(PLEX_TOKEN_KEY, ""));
  const [plexUrl, setPlexUrl] = useState(() => store.get(PLEX_URL_KEY, "http://192.168.4."));
  const [watchlist, setWatchlist] = useState(() => store.get(WATCHLIST_KEY, []));
  const [watched, setWatched] = useState(() => store.get(WATCHED_KEY, []));
  const [excludedLibraries, setExcludedLibraries] = useState(() => store.get(PLEX_EXCLUDED_KEY, DEFAULT_EXCLUDED_LIBRARIES));
  const [excludedInput, setExcludedInput] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [jwStatus, setJwStatus] = useState("idle"); // idle | loading | ok | error | cached
  const [plexStatus, setPlexStatus] = useState("idle");
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all | streaming | plex
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load caches on mount
  useEffect(() => {
    const jwCache = store.get(JW_CACHE_KEY, []);
    const plexCache = store.get(PLEX_CACHE_KEY, []);
    const jwTs = store.get(JW_CACHE_TS_KEY, 0);
    const combined = [...jwCache, ...plexCache];
    if (combined.length > 0) setCatalog(combined);

    const isStale = Date.now() - jwTs > SEVEN_DAYS_MS;
    if (isStale && jwCache.length === 0) {
      loadJustWatch();
    } else if (jwCache.length > 0) {
      setJwStatus(isStale ? "idle" : "cached");
    }
  }, []);

  const loadJustWatch = useCallback(async () => {
    setJwStatus("loading");
    try {
      const results = await fetchJustWatch();
      store.set(JW_CACHE_KEY, results);
      store.set(JW_CACHE_TS_KEY, Date.now());
      setCatalog(prev => {
        const plexItems = prev.filter(i => i.source === "plex");
        return [...results, ...plexItems];
      });
      setJwStatus("ok");
      notify(`Loaded ${results.length} streaming titles`, "success");
    } catch (err) {
      setJwStatus("error");
      notify("JustWatch fetch failed. Using cache if available.", "error");
    }
  }, []);

  const loadPlex = useCallback(async () => {
    if (!plexToken || !plexUrl) {
      notify("Add your Plex URL and token in Settings first", "error");
      return;
    }
    setPlexStatus("loading");
    try {
      const results = await fetchPlexLibrary(plexUrl, plexToken, excludedLibraries);
      store.set(PLEX_CACHE_KEY, results);
      setCatalog(prev => {
        const jwItems = prev.filter(i => i.source === "streaming");
        return [...jwItems, ...results];
      });
      setPlexStatus("ok");
      notify(`Loaded ${results.length} titles from Plex`, "success");
    } catch (err) {
      setPlexStatus("error");
      notify(err.message || "Plex connection failed", "error");
    }
  }, [plexToken, plexUrl, excludedLibraries]);

  const addToWatchlist = (item) => {
    if (watchlist.find(w => w.id === item.id)) {
      notify("Already on your watchlist", "info");
      return;
    }
    const updated = [{ ...item, addedAt: Date.now() }, ...watchlist];
    setWatchlist(updated);
    store.set(WATCHLIST_KEY, updated);
    notify(`Added "${item.title}" to watchlist`, "success");
  };

  const markWatched = (item) => {
    const newWatched = [{ ...item, watchedAt: Date.now() }, ...watched.filter(w => w.id !== item.id)];
    setWatched(newWatched);
    store.set(WATCHED_KEY, newWatched);
    const newWatchlist = watchlist.filter(w => w.id !== item.id);
    setWatchlist(newWatchlist);
    store.set(WATCHLIST_KEY, newWatchlist);
    notify(`Marked "${item.title}" as watched ✓`, "success");
  };

  const removeFromWatchlist = (id) => {
    const updated = watchlist.filter(w => w.id !== id);
    setWatchlist(updated);
    store.set(WATCHLIST_KEY, updated);
  };

  const getRecs = async () => {
    if (catalog.length === 0) {
      notify("Load your catalog first", "error");
      return;
    }
    setRecLoading(true);
    setRecommendations(null);
    try {
      const result = await getRecommendations({ prompt, catalog, watchlist, watched });
      setRecommendations(result);
    } catch (err) {
      notify("Recommendation fetch failed", "error");
    }
    setRecLoading(false);
  };

  const filteredCatalog = catalog.filter(i => {
    if (activeTab === "streaming") return i.source === "streaming";
    if (activeTab === "plex") return i.source === "plex";
    return true;
  });

  const jwCacheAge = () => {
    const ts = store.get(JW_CACHE_TS_KEY, 0);
    if (!ts) return null;
    const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
    return days === 0 ? "today" : `${days}d ago`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e8e4dc",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      position: "relative",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.035, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 100,
          background: notification.type === "error" ? "#3d1a1a" : notification.type === "success" ? "#1a3d2a" : "#1a1a3d",
          border: `1px solid ${notification.type === "error" ? "#8b2020" : notification.type === "success" ? "#208b4a" : "#20408b"}`,
          color: "#e8e4dc", padding: "10px 18px", borderRadius: 4,
          fontSize: 13, fontFamily: "monospace", letterSpacing: "0.02em",
          animation: "slideIn 0.2s ease",
        }}>
          {notification.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        input, textarea { outline: none; }
        button { cursor: pointer; }
      `}</style>

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10,
        borderBottom: "1px solid #1e1e2a",
        padding: "18px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(10,10,15,0.95)", backdropFilter: "blur(8px)",
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", color: "#666", textTransform: "uppercase", marginBottom: 2 }}>
            Tonight's
          </div>
          <div style={{ fontSize: 22, letterSpacing: "0.04em", color: "#e8e4dc", fontStyle: "italic" }}>
            What to Watch
          </div>
        </div>

        <nav style={{ display: "flex", gap: 6 }}>
          {[["home", "◈ Home"], ["watchlist", `◻ Watchlist${watchlist.length > 0 ? ` (${watchlist.length})` : ""}`], ["settings", "⚙ Settings"]].map(([id, label]) => (
            <button key={id} onClick={() => setScreen(id)} style={{
              background: screen === id ? "#1e1e2a" : "transparent",
              border: `1px solid ${screen === id ? "#333" : "transparent"}`,
              color: screen === id ? "#e8e4dc" : "#666",
              padding: "6px 14px", borderRadius: 3,
              fontSize: 12, letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </nav>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── HOME ── */}
        {screen === "home" && (
          <div>
            {/* Status bar */}
            <div style={{
              display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap",
            }}>
              {/* JustWatch status */}
              <div style={{
                flex: 1, minWidth: 200,
                background: "#0f0f18", border: "1px solid #1e1e2a", borderRadius: 4,
                padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Streaming</div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>
                    Max · Apple TV+
                    {jwCacheAge() && <span style={{ color: "#555", marginLeft: 8, fontSize: 11 }}>({jwCacheAge()})</span>}
                  </div>
                </div>
                <button onClick={loadJustWatch} disabled={jwStatus === "loading"} style={{
                  background: "#1a1a28", border: "1px solid #2a2a3a",
                  color: jwStatus === "loading" ? "#555" : "#9090c0",
                  padding: "5px 12px", borderRadius: 3, fontSize: 11, letterSpacing: "0.1em",
                }}>
                  {jwStatus === "loading" ? "···" : jwStatus === "ok" ? "↻ Refresh" : "↓ Fetch"}
                </button>
              </div>

              {/* Plex status */}
              <div style={{
                flex: 1, minWidth: 200,
                background: "#0f0f18", border: "1px solid #1e1e2a", borderRadius: 4,
                padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Plex Library</div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>
                    {catalog.filter(i => i.source === "plex").length > 0
                      ? `${catalog.filter(i => i.source === "plex").length} titles`
                      : "Not loaded"}
                  </div>
                </div>
                <button onClick={loadPlex} disabled={plexStatus === "loading"} style={{
                  background: "#1a1a28", border: "1px solid #2a2a3a",
                  color: plexStatus === "loading" ? "#555" : "#c09060",
                  padding: "5px 12px", borderRadius: 3, fontSize: 11, letterSpacing: "0.1em",
                }}>
                  {plexStatus === "loading" ? "···" : plexStatus === "ok" ? "↻ Refresh" : "↓ Connect"}
                </button>
              </div>

              {/* Catalog count */}
              <div style={{
                background: "#0f0f18", border: "1px solid #1e1e2a", borderRadius: 4,
                padding: "12px 16px", display: "flex", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Total</div>
                  <div style={{ fontSize: 20, color: "#e8e4dc", fontStyle: "italic" }}>{catalog.length}</div>
                </div>
              </div>
            </div>

            {/* Recommendation prompt */}
            <div style={{
              background: "#0c0c16", border: "1px solid #1e1e2a", borderRadius: 4,
              padding: "20px", marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 12 }}>
                What are you in the mood for?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && getRecs()}
                  placeholder="e.g. something dark and tense, or a comedy under 2 hours..."
                  style={{
                    flex: 1, background: "#0a0a12", border: "1px solid #252535",
                    borderRadius: 3, padding: "10px 14px",
                    color: "#e8e4dc", fontSize: 14, fontFamily: "Georgia, serif",
                    letterSpacing: "0.02em",
                  }}
                />
                <button onClick={getRecs} disabled={recLoading || catalog.length === 0} style={{
                  background: recLoading ? "#1a1a28" : "#2a2a4a",
                  border: "1px solid #3a3a6a",
                  color: recLoading ? "#555" : "#a0a0e0",
                  padding: "10px 20px", borderRadius: 3,
                  fontSize: 13, letterSpacing: "0.1em",
                  transition: "all 0.15s",
                }}>
                  {recLoading ? <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>thinking…</span> : "Recommend →"}
                </button>
              </div>

              {/* Quick prompts */}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {["Tonight's top pick", "Something short", "Hidden gem", "Best rated", "Comfort rewatch"].map(q => (
                  <button key={q} onClick={() => { setPrompt(q); }} style={{
                    background: "transparent", border: "1px solid #252530",
                    color: "#555", padding: "4px 10px", borderRadius: 2, fontSize: 11,
                    letterSpacing: "0.08em", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = "#404060"; e.target.style.color = "#888"; }}
                    onMouseLeave={e => { e.target.style.borderColor = "#252530"; e.target.style.color = "#555"; }}
                  >{q}</button>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {recommendations && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
                  Recommendations
                </div>
                {recommendations.message && (
                  <div style={{ color: "#888", fontSize: 13, fontStyle: "italic", marginBottom: 14 }}>
                    {recommendations.message}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {(recommendations.recommendations || []).map((rec, i) => {
                    const item = catalog.find(c => c.title.toLowerCase() === rec.title.toLowerCase());
                    return (
                      <div key={i} style={{
                        background: "#0c0c16", border: "1px solid #1a1a24",
                        borderRadius: 4, padding: "14px 18px",
                        display: "flex", gap: 16, alignItems: "flex-start",
                        transition: "border-color 0.15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2a3a"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a24"}
                      >
                        <div style={{ fontSize: 24, color: "#333", minWidth: 36, textAlign: "center", paddingTop: 2, fontStyle: "italic" }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, color: "#e8e4dc" }}>{rec.title}</span>
                            <span style={{ fontSize: 10, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase" }}>{rec.where}</span>
                            {rec.mood && <span style={{ fontSize: 10, color: "#404060", border: "1px solid #252540", padding: "1px 6px", borderRadius: 2 }}>{rec.mood}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#777", lineHeight: 1.5 }}>{rec.reason}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, paddingTop: 2 }}>
                          {item && (
                            <>
                              <button onClick={() => addToWatchlist(item)} title="Add to watchlist" style={{
                                background: "transparent", border: "1px solid #252535",
                                color: "#555", width: 28, height: 28, borderRadius: 3, fontSize: 14,
                              }}>+</button>
                              <button onClick={() => markWatched(item)} title="Mark watched" style={{
                                background: "transparent", border: "1px solid #252535",
                                color: "#555", width: 28, height: 28, borderRadius: 3, fontSize: 12,
                              }}>✓</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catalog browser */}
            {catalog.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase" }}>
                    Browse Catalog
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["all", "All"], ["streaming", "Streaming"], ["plex", "Plex"]].map(([id, label]) => (
                      <button key={id} onClick={() => setActiveTab(id)} style={{
                        background: activeTab === id ? "#1a1a28" : "transparent",
                        border: `1px solid ${activeTab === id ? "#2a2a3a" : "transparent"}`,
                        color: activeTab === id ? "#aaa" : "#444",
                        padding: "3px 10px", borderRadius: 2, fontSize: 11,
                      }}>{label} {id === "all" ? catalog.length : id === "streaming" ? catalog.filter(i => i.source === "streaming").length : catalog.filter(i => i.source === "plex").length}</button>
                    ))}
                  </div>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8,
                  maxHeight: 400, overflowY: "auto",
                }}>
                  {filteredCatalog.slice(0, 100).map(item => (
                    <div key={item.id} style={{
                      background: "#0c0c16", border: "1px solid #181820",
                      borderRadius: 3, padding: "10px 12px",
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2a3a"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#181820"}
                      onClick={() => addToWatchlist(item)}
                      title="Click to add to watchlist"
                    >
                      <div style={{ fontSize: 13, color: "#ccc", marginBottom: 4, lineHeight: 1.3 }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>
                        {item.releaseYear} · {item.streamingOn[0]}
                      </div>
                      {item.imdbScore && (
                        <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>★ {item.imdbScore}</div>
                      )}
                    </div>
                  ))}
                </div>
                {filteredCatalog.length > 100 && (
                  <div style={{ textAlign: "center", color: "#444", fontSize: 11, marginTop: 10 }}>
                    Showing 100 of {filteredCatalog.length} — use recommendations to find more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── WATCHLIST ── */}
        {screen === "watchlist" && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 18 }}>
              Watchlist · {watchlist.length} titles
            </div>
            {watchlist.length === 0 ? (
              <div style={{ color: "#444", fontStyle: "italic", fontSize: 14 }}>
                No titles yet. Get recommendations and add them with the + button.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {watchlist.map(item => (
                  <div key={item.id} style={{
                    background: "#0c0c16", border: "1px solid #1a1a24",
                    borderRadius: 4, padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "#ddd" }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                        {item.type} · {item.streamingOn?.join(", ")} · {item.releaseYear || ""}
                      </div>
                    </div>
                    <button onClick={() => markWatched(item)} title="Mark as watched" style={{
                      background: "transparent", border: "1px solid #252535",
                      color: "#608060", padding: "4px 12px", borderRadius: 3, fontSize: 12,
                    }}>✓ Watched</button>
                    <button onClick={() => removeFromWatchlist(item.id)} style={{
                      background: "transparent", border: "none",
                      color: "#444", fontSize: 16, padding: "4px",
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {watched.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#444", textTransform: "uppercase", marginBottom: 14 }}>
                  Watched History · {watched.length}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {watched.slice(0, 20).map(item => (
                    <div key={item.id} style={{
                      background: "#0a0a12", border: "1px solid #141420",
                      borderRadius: 4, padding: "10px 16px",
                      display: "flex", alignItems: "center", gap: 14, opacity: 0.7,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#999" }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: "#444" }}>
                          {item.type} · watched {new Date(item.watchedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {screen === "settings" && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 20 }}>
              Settings
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#0c0c16", border: "1px solid #1a1a24", borderRadius: 4, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 14 }}>Plex Connection</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 5, letterSpacing: "0.1em" }}>PLEX URL</label>
                    <input value={plexUrl} onChange={e => { setPlexUrl(e.target.value); store.set(PLEX_URL_KEY, e.target.value); }}
                      placeholder="http://192.168.4.x:32400"
                      style={{ width: "100%", background: "#080810", border: "1px solid #202030", borderRadius: 3, padding: "8px 12px", color: "#ccc", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 5, letterSpacing: "0.1em" }}>PLEX TOKEN</label>
                    <input type="password" value={plexToken} onChange={e => { setPlexToken(e.target.value); store.set(PLEX_TOKEN_KEY, e.target.value); }}
                      placeholder="Your X-Plex-Token"
                      style={{ width: "100%", background: "#080810", border: "1px solid #202030", borderRadius: 3, padding: "8px 12px", color: "#ccc", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>
                    Find your token: Plex Web → Settings → Troubleshoot → "Get an X-Plex-Token". Only works on local network.
                  </div>
                </div>
              </div>

              <div style={{ background: "#0c0c16", border: "1px solid #1a1a24", borderRadius: 4, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 14 }}>Streaming Services</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {STREAMING_SERVICES.map(s => (
                    <div key={s.id} style={{
                      background: "#1a1a28", border: "1px solid #2a2a3a",
                      borderRadius: 3, padding: "6px 14px",
                      fontSize: 12, color: "#9090c0",
                    }}>✓ {s.label}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 10 }}>
                  Hardcoded to your services. Fetched from JustWatch weekly.
                </div>
              </div>

              <div style={{ background: "#0c0c16", border: "1px solid #1a1a24", borderRadius: 4, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 6 }}>Excluded Plex Libraries</div>
                <div style={{ fontSize: 11, color: "#444", marginBottom: 12, lineHeight: 1.6 }}>
                  These library names will be skipped when connecting to Plex. Case-insensitive. Add any library you don't want in recommendations.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {excludedLibraries.map(lib => (
                    <div key={lib} style={{
                      background: "#1a1218", border: "1px solid #2a1a20",
                      borderRadius: 3, padding: "4px 10px",
                      fontSize: 11, color: "#a06070",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {lib}
                      <button onClick={() => {
                        const updated = excludedLibraries.filter(l => l !== lib);
                        setExcludedLibraries(updated);
                        store.set(PLEX_EXCLUDED_KEY, updated);
                      }} style={{ background: "none", border: "none", color: "#604050", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={excludedInput}
                    onChange={e => setExcludedInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && excludedInput.trim()) {
                        const updated = [...excludedLibraries, excludedInput.trim()];
                        setExcludedLibraries(updated);
                        store.set(PLEX_EXCLUDED_KEY, updated);
                        setExcludedInput("");
                      }
                    }}
                    placeholder="Library name to exclude…"
                    style={{ flex: 1, background: "#080810", border: "1px solid #202030", borderRadius: 3, padding: "6px 10px", color: "#ccc", fontSize: 12, fontFamily: "monospace" }}
                  />
                  <button onClick={() => {
                    if (excludedInput.trim()) {
                      const updated = [...excludedLibraries, excludedInput.trim()];
                      setExcludedLibraries(updated);
                      store.set(PLEX_EXCLUDED_KEY, updated);
                      setExcludedInput("");
                    }
                  }} style={{ background: "#1a1218", border: "1px solid #2a1a20", color: "#a06070", padding: "6px 14px", borderRadius: 3, fontSize: 11 }}>
                    + Add
                  </button>
                </div>
              </div>

              <div style={{ background: "#0c0c16", border: "1px solid #1a1a24", borderRadius: 4, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 10 }}>Data</div>
                <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>
                  All data stored locally in this browser.<br />
                  JustWatch cache: {jwCacheAge() || "not fetched"}<br />
                  Watchlist: {watchlist.length} titles<br />
                  Watched: {watched.length} titles
                </div>
                <button onClick={() => {
                  if (confirm("Clear all local data? This cannot be undone.")) {
                    [WATCHLIST_KEY, WATCHED_KEY, JW_CACHE_KEY, JW_CACHE_TS_KEY, PLEX_CACHE_KEY].forEach(k => localStorage.removeItem(k));
                    setWatchlist([]); setWatched([]); setCatalog([]);
                    notify("Data cleared", "info");
                  }
                }} style={{
                  marginTop: 12, background: "transparent", border: "1px solid #3a1a1a",
                  color: "#6a3030", padding: "6px 14px", borderRadius: 3, fontSize: 11,
                }}>Clear All Data</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
