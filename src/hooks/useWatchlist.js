import { useState } from "react";
import { STORAGE_KEYS } from "../utils/constants";
import { readStorage, writeStorage } from "../utils/storage";

export function useWatchlist(notify) {
  const [watchlist, setWatchlist] = useState(() =>
    readStorage(STORAGE_KEYS.watchlist, [])
  );
  const [watched, setWatched] = useState(() =>
    readStorage(STORAGE_KEYS.watched, [])
  );

  function addToWatchlist(item) {
    if (watchlist.find((watchlistItem) => watchlistItem.id === item.id)) {
      notify("Already on your watchlist", "info");
      return;
    }

    const updated = [{ ...item, addedAt: Date.now() }, ...watchlist];
    setWatchlist(updated);
    writeStorage(STORAGE_KEYS.watchlist, updated);
    notify(`Added "${item.title}" to watchlist`, "success");
  }

  function markWatched(item) {
    const newWatched = [
      { ...item, watchedAt: Date.now() },
      ...watched.filter((watchedItem) => watchedItem.id !== item.id),
    ];
    const newWatchlist = watchlist.filter(
      (watchlistItem) => watchlistItem.id !== item.id
    );

    setWatched(newWatched);
    setWatchlist(newWatchlist);
    writeStorage(STORAGE_KEYS.watched, newWatched);
    writeStorage(STORAGE_KEYS.watchlist, newWatchlist);
    notify(`Marked "${item.title}" as watched ✓`, "success");
  }

  function removeFromWatchlist(id) {
    const updated = watchlist.filter((item) => item.id !== id);
    setWatchlist(updated);
    writeStorage(STORAGE_KEYS.watchlist, updated);
  }

  function clearWatchData() {
    setWatchlist([]);
    setWatched([]);
    writeStorage(STORAGE_KEYS.watchlist, []);
    writeStorage(STORAGE_KEYS.watched, []);
  }

  return {
    watchlist,
    watched,
    addToWatchlist,
    markWatched,
    removeFromWatchlist,
    clearWatchData,
  };
}
