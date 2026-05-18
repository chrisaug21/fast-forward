import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_EXCLUDED_LIBRARIES,
  STORAGE_KEYS,
} from "../utils/constants";
import fetchStreamingCatalog from "../utils/streaming";
import { fetchPlexLibrary } from "../utils/plex";
import { readStorage, removeStorage, writeStorage } from "../utils/storage";

function getInitialCatalogState() {
  const plexCache = readStorage(STORAGE_KEYS.plexCache, []);

  return [...plexCache];
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
  const [streamingStatus, setStreamingStatus] = useState("idle");
  const [streamingFetchedAt, setStreamingFetchedAt] = useState(null);
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
      const { items: streamingItemsResponse, meta } = await fetchStreamingCatalog();
      const items = Array.isArray(streamingItemsResponse?.titles)
        ? streamingItemsResponse.titles
        : streamingItemsResponse;
      setCatalog((previousCatalog) => {
        const plexItems = previousCatalog.filter((item) => item.source === "plex");
        return [...items, ...plexItems];
      });
      setStreamingFetchedAt(meta?.fetchedAt || null);
      setStreamingStatus(meta?.fromCache ? "cached" : "ok");
      notifyRef.current(`Loaded ${items.length} streaming titles`, "success");
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
    if (!streamingFetchedAt) {
      return null;
    }

    const timestamp = new Date(streamingFetchedAt).getTime();
    const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
    return days === 0 ? "today" : `${days}d ago`;
  }, [streamingFetchedAt]);

  const clearCatalogData = useCallback(() => {
    setCatalog([]);
    setStreamingStatus("idle");
    setStreamingFetchedAt(null);
    setPlexStatus("idle");
    removeStorage(STORAGE_KEYS.justWatchCache);
    removeStorage(STORAGE_KEYS.justWatchCacheTimestamp);
    removeStorage(STORAGE_KEYS.plexCache);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStreamingCatalog();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
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
