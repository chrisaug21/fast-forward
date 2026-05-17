import { STORAGE_KEYS } from "../../utils/constants";
import { removeStorage } from "../../utils/storage";
import SettingsCard from "./SettingsCard";

export default function DataSection({
  justWatchCacheAge,
  watchlistCount,
  watchedCount,
  onClearWatchData,
  onClearCatalogData,
  onNotify,
}) {
  function clearAllData() {
    if (!confirm("Clear all local data? This cannot be undone.")) {
      return;
    }

    removeStorage(STORAGE_KEYS.watchlist);
    removeStorage(STORAGE_KEYS.watched);
    removeStorage(STORAGE_KEYS.justWatchCache);
    removeStorage(STORAGE_KEYS.justWatchCacheTimestamp);
    removeStorage(STORAGE_KEYS.plexCache);
    onClearWatchData();
    onClearCatalogData();
    onNotify("Data cleared", "info");
  }

  return (
    <SettingsCard title="Data">
      <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>
        All data stored locally in this browser.
        <br />
        JustWatch cache: {justWatchCacheAge || "not fetched"}
        <br />
        Watchlist: {watchlistCount} titles
        <br />
        Watched: {watchedCount} titles
      </div>
      <button
        onClick={clearAllData}
        style={{
          marginTop: 12,
          background: "transparent",
          border: "1px solid #3a1a1a",
          color: "#6a3030",
          padding: "6px 14px",
          borderRadius: 3,
          fontSize: 11,
        }}
      >
        Clear All Data
      </button>
    </SettingsCard>
  );
}
