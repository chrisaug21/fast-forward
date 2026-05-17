import { useEffect, useRef, useState } from "react";
import Home from "./components/Home";
import Settings from "./components/Settings";
import Watchlist from "./components/Watchlist";
import { useCatalog } from "./hooks/useCatalog";
import { useWatchlist } from "./hooks/useWatchlist";
import { APP_VERSION } from "./utils/constants";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  function notify(message, type = "info") {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setNotification({ msg: message, type });
    timerRef.current = setTimeout(() => {
      setNotification(null);
      timerRef.current = null;
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const catalogState = useCatalog(notify);
  const watchlistState = useWatchlist(notify);

  const navigationItems = [
    ["home", "◈ Home"],
    [
      "watchlist",
      `◻ Watchlist${watchlistState.watchlist.length > 0 ? ` (${watchlistState.watchlist.length})` : ""}`,
    ],
    ["settings", "⚙ Settings"],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e8e4dc",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.035,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      {notification && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            background:
              notification.type === "error"
                ? "#3d1a1a"
                : notification.type === "success"
                  ? "#1a3d2a"
                  : "#1a1a3d",
            border: `1px solid ${
              notification.type === "error"
                ? "#8b2020"
                : notification.type === "success"
                  ? "#208b4a"
                  : "#20408b"
            }`,
            color: "#e8e4dc",
            padding: "10px 18px",
            borderRadius: 4,
            fontSize: 13,
            fontFamily: "monospace",
            letterSpacing: "0.02em",
            animation: "slideIn 0.2s ease",
          }}
        >
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

      <header
        style={{
          position: "relative",
          zIndex: 10,
          borderBottom: "1px solid #1e1e2a",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,10,15,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              color: "#666",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Tonight&apos;s
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.04em",
              color: "#e8e4dc",
              fontStyle: "italic",
            }}
          >
            What to Watch
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#4d4d58",
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            v{APP_VERSION}
          </div>

          <nav style={{ display: "flex", gap: 6 }}>
            {navigationItems.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setScreen(id)}
                style={{
                  background: screen === id ? "#1e1e2a" : "transparent",
                  border: `1px solid ${screen === id ? "#333" : "transparent"}`,
                  color: screen === id ? "#e8e4dc" : "#666",
                  padding: "6px 14px",
                  borderRadius: 3,
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 960,
          margin: "0 auto",
          padding: "28px 24px",
        }}
      >
        {screen === "home" && (
          <Home
            catalog={catalogState.catalog}
            watchlist={watchlistState.watchlist}
            watched={watchlistState.watched}
            streamingStatus={catalogState.streamingStatus}
            plexStatus={catalogState.plexStatus}
            onLoadStreamingCatalog={catalogState.loadStreamingCatalog}
            onLoadPlex={catalogState.loadPlex}
            streamingCacheAge={catalogState.getStreamingCacheAge()}
            onAddToWatchlist={watchlistState.addToWatchlist}
            onMarkWatched={watchlistState.markWatched}
            onNotify={notify}
          />
        )}

        {screen === "watchlist" && (
          <Watchlist
            watchlist={watchlistState.watchlist}
            watched={watchlistState.watched}
            onMarkWatched={watchlistState.markWatched}
            onRemoveFromWatchlist={watchlistState.removeFromWatchlist}
          />
        )}

        {screen === "settings" && (
          <Settings
            plexUrl={catalogState.plexUrl}
            plexToken={catalogState.plexToken}
            excludedLibraries={catalogState.excludedLibraries}
            onPlexUrlChange={catalogState.setPlexUrl}
            onPlexTokenChange={catalogState.setPlexToken}
            onExcludedLibrariesChange={catalogState.setExcludedLibraries}
            streamingCacheAge={catalogState.getStreamingCacheAge()}
            watchlistCount={watchlistState.watchlist.length}
            watchedCount={watchlistState.watched.length}
            onClearWatchData={watchlistState.clearWatchData}
            onClearCatalogData={catalogState.clearCatalogData}
            onNotify={notify}
          />
        )}
      </main>
    </div>
  );
}
