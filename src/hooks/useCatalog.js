import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_EXCLUDED_LIBRARIES,
  SEVEN_DAYS_MS,
  STORAGE_KEYS,
} from "../utils/constants";
import fetchStreamingCatalog from "../utils/streaming";
import { fetchPlexLibrary } from "../utils/plex";
import { readStorage, removeStorage, writeStorage } from "../utils/storage";

function getInitialCatalogState() {
  const justWatchCache = readStorage(STORAGE_KEYS.justWatchCache, []);
  const plexCache = readStorage(STORAGE_KEYS.plexCache, []);

  return [...justWatchCache, ...plexCache];
}

function getInitialStreamingStatus() {
  const justWatchCache = readStorage(STORAGE_KEYS.justWatchCache, []);
  const justWatchTimestamp = readStorage(STORAGE_KEYS.justWatchCacheTimestamp, 0);

  if (justWatchCache.length === 0) {
    return "idle";
  }

  return Date.now() - justWatchTimestamp > SEVEN_DAYS_MS ? "idle" : "cached";
}

export function useCatalog(notify) {
  const [plexToken, setPlexTokenState] = useState(() =>
    readStorage(STORAGE_KEYS.plexToken, "")
  );
  const [plexUrl, setPlexUrlState] = useState(() =>
    readStorage(STORAGE_KEYS.plexUrl, "http://192.168.4.")
  );
  const [excludedLibraries, setExcludedLibrariesState] = useState(() =>
    readStorage(STORAGE_KEYS.plexExcluded, DEFAULT_EXCLUDED_LIBRARIES)
  );
  const [catalog, setCatalog] = useState(getInitialCatalogState);
  const [streamingStatus, setStreamingStatus] = useState(getInitialStreamingStatus);
  const [plexStatus, setPlexStatus] = useState("idle");
  const notifyRef = useRef(notify);
  const isFetchingStreamingRef = useRef(false);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const setPlexToken = useCallback((value) => {
    setPlexTokenState(value);
    writeStorage(STORAGE_KEYS.plexToken, value);
  }, []);

  const setPlexUrl = useCallback((value) => {
    setPlexUrlState(value);
    writeStorage(STORAGE_KEYS.plexUrl, value);
  }, []);

  const setExcludedLibraries = useCallback((value) => {
    setExcludedLibrariesState(value);
    writeStorage(STORAGE_KEYS.plexExcluded, value);
  }, []);

  const loadStreamingCatalog = useCallback(async () => {
    if (isFetchingStreamingRef.current) {
      return;
    }

    isFetchingStreamingRef.current = true;
    setStreamingStatus("loading");

    try {
      const results = await fetchStreamingCatalog();
      writeStorage(STORAGE_KEYS.justWatchCache, results);
      writeStorage(STORAGE_KEYS.justWatchCacheTimestamp, Date.now());
      setCatalog((previousCatalog) => {
        const plexItems = previousCatalog.filter((item) => item.source === "plex");
        return [...results, ...plexItems];
      });
      setStreamingStatus("ok");
      notifyRef.current(`Loaded ${results.length} streaming titles`, "success");
    } catch {
      setStreamingStatus("error");
      notifyRef.current("Streaming catalog fetch failed. Using cache if available.", "error");
    } finally {
      isFetchingStreamingRef.current = false;
    }
  }, []);

  const loadPlex = useCallback(async () => {
    if (!plexToken || !plexUrl) {
      notifyRef.current("Add your Plex URL and token in Settings first", "error");
      return;
    }

    setPlexStatus("loading");

    try {
      const results = await fetchPlexLibrary(
        plexUrl,
        plexToken,
        excludedLibraries
      );
      writeStorage(STORAGE_KEYS.plexCache, results);
      setCatalog((previousCatalog) => {
        const streamingItems = previousCatalog.filter(
          (item) => item.source === "streaming"
        );
        return [...streamingItems, ...results];
      });
      setPlexStatus("ok");
      notifyRef.current(`Loaded ${results.length} titles from Plex`, "success");
    } catch (error) {
      setPlexStatus("error");
      console.debug("Plex connection error", error);
      notifyRef.current(
        "Unable to connect to Plex. Please check your network or credentials.",
        "error"
      );
    }
  }, [excludedLibraries, plexToken, plexUrl]);

  const getStreamingCacheAge = useCallback(() => {
    const timestamp = readStorage(STORAGE_KEYS.justWatchCacheTimestamp, 0);

    if (!timestamp) {
      return null;
    }

    const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
    return days === 0 ? "today" : `${days}d ago`;
  }, []);

  const clearCatalogData = useCallback(() => {
    setCatalog([]);
    setStreamingStatus("idle");
    setPlexStatus("idle");
    removeStorage(STORAGE_KEYS.justWatchCache);
    removeStorage(STORAGE_KEYS.justWatchCacheTimestamp);
    removeStorage(STORAGE_KEYS.plexCache);
  }, []);

  useEffect(() => {
    const justWatchTimestamp = readStorage(STORAGE_KEYS.justWatchCacheTimestamp, 0);

    const isStale = Date.now() - justWatchTimestamp > SEVEN_DAYS_MS;

    if (isStale) {
      const timeoutId = setTimeout(() => {
        loadStreamingCatalog();
      }, 0);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [loadStreamingCatalog]);

  return {
    plexToken,
    setPlexToken,
    plexUrl,
    setPlexUrl,
    excludedLibraries,
    setExcludedLibraries,
    catalog,
    streamingStatus,
    plexStatus,
    loadStreamingCatalog,
    loadPlex,
    getStreamingCacheAge,
    clearCatalogData,
  };
}
