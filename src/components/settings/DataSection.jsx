import { STORAGE_KEYS } from "../../utils/constants";
import { removeStorage } from "../../utils/storage";
import SettingsCard from "./SettingsCard";

export default function DataSection({
  streamingCacheAge,
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
      <div className="ff-helper-text" style={{ lineHeight: 1.8 }}>
        All data stored locally in this browser.
        <br />
        Streaming cache: {streamingCacheAge || "not fetched"}
        <br />
        Watchlist: {watchlistCount} titles
        <br />
        Watched: {watchedCount} titles
      </div>
      <button
        onClick={clearAllData}
        className="ff-button-danger"
      >
        Clear All Data
      </button>
    </SettingsCard>
  );
}
