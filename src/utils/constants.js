export const APP_VERSION = "0.1.2";

export const STORAGE_KEYS = {
  plexToken: "wtw_plex_token",
  plexUrl: "wtw_plex_url",
  watchlist: "wtw_watchlist",
  watched: "wtw_watched",
  justWatchCache: "wtw_jw_cache",
  justWatchCacheTimestamp: "wtw_jw_cache_ts",
  plexCache: "wtw_plex_cache",
  plexExcluded: "wtw_plex_excluded",
};

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_EXCLUDED_LIBRARIES = [
  "Sports",
  "Home Movies",
  "Music",
  "Audiobooks",
  "Live Music",
  "Photos",
  "Plextras",
];

export const STREAMING_SERVICES = [
  { id: "hbo", jwId: "hbo", label: "Max (HBO)" },
  { id: "apple", jwId: "apple", label: "Apple TV+" },
];
