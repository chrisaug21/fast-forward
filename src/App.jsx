import { useEffect, useRef, useState } from "react";
import "./App.css";
import Home from "./components/Home";
import Settings from "./components/Settings";
import Watchlist from "./components/Watchlist";
import { useCatalog } from "./hooks/useCatalog";
import { useWatchlist } from "./hooks/useWatchlist";

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
    ["home", "Home"],
    [
      "watchlist",
      `Watchlist${watchlistState.watchlist.length > 0 ? ` (${watchlistState.watchlist.length})` : ""}`,
    ],
    ["settings", "Settings"],
  ];

  return (
    <div className="ff-app">
      <div className="ff-noise" />

      {notification && (
        <div className={`ff-toast ff-toast--${notification.type || "info"}`}>
          {notification.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <header className="ff-header">
        <div className="ff-wordmark" aria-label="FAST FORWARD">
          <span className="ff-wordmark__fast">FAST</span>
          <span className="ff-wordmark__forward">FORWARD</span>
        </div>

        <nav className="ff-nav" aria-label="Primary navigation">
          {navigationItems.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={`ff-nav__button${screen === id ? " ff-nav__button--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="ff-main">
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
