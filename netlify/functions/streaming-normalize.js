export const SERVICE_MAP = {
  max: { label: "Max", watchmode: "387", rapidApi: "max.subscription" },
  apple_tv: { label: "Apple TV+", watchmode: "371", rapidApi: "apple.subscription" },
};

function dedupeItems(items) {
  const deduped = new Map();

  items.forEach((item) => {
    const key =
      item.id != null
        ? `${item.id}:${item.type}`
        : `${item.title}:${item.type}:${item.releaseYear || "unknown"}`;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, {
        ...item,
        genres: Array.isArray(item.genres) ? [...new Set(item.genres)] : [],
        streamingOn: [...item.streamingOn],
      });
      return;
    }

    existing.streamingOn = [...new Set([...existing.streamingOn, ...item.streamingOn])];
    existing.genres = [...new Set([...(existing.genres || []), ...(item.genres || [])])];
    existing.tmdbId = existing.tmdbId ?? item.tmdbId ?? null;
    existing.runtime = existing.runtime ?? item.runtime ?? null;
    existing.imdbScore = existing.imdbScore ?? item.imdbScore ?? null;
    existing.releaseYear = existing.releaseYear ?? item.releaseYear ?? null;
    existing.overview = existing.overview || item.overview || "";
    existing.description = existing.description || item.description || "";
    existing.posterUrl = existing.posterUrl || item.posterUrl || null;
    existing.backdropUrl = existing.backdropUrl || item.backdropUrl || null;
    existing.imdbId = existing.imdbId || item.imdbId || null;
    existing.contentRating = existing.contentRating || item.contentRating || null;
  });

  return [...deduped.values()];
}

export function mergeNormalizedItems(items) {
  return dedupeItems(items);
}

function normalizeItem(rawItem, fallbackServiceLabel) {
  const rawType = rawItem.showType || rawItem.type || rawItem.tmdbType || rawItem.media_type;
  const isSeries = [
    "series",
    "show",
    "tv",
    "tv_miniseries",
    "tv_series",
  ].includes(rawType);
  const streamingOn =
    Array.isArray(rawItem.streamingOn) && rawItem.streamingOn.length > 0
      ? rawItem.streamingOn
      : [fallbackServiceLabel];

  return {
    id:
      rawItem.tmdbId ||
      rawItem.tmdb_id ||
      rawItem.id ||
      `${rawItem.title || rawItem.name || "unknown"}:${isSeries ? "show" : "movie"}:${
        rawItem.releaseYear || rawItem.year || rawItem.firstAirYear || "unknown"
      }`,
    tmdbId: rawItem.tmdbId || rawItem.tmdb_id || null,
    title: rawItem.title || rawItem.name || "Unknown title",
    type: isSeries ? "TV Show" : "Movie",
    genres: Array.isArray(rawItem.genres)
      ? rawItem.genres.map((genre) => genre.name || genre).filter(Boolean)
      : [],
    overview: rawItem.overview || rawItem.plot_overview || rawItem.summary || "",
    runtime: rawItem.runtime || rawItem.runtime_minutes || null,
    imdbScore: rawItem.rating ? Number(rawItem.rating) / 10 : rawItem.imdbRating || null,
    releaseYear: rawItem.releaseYear || rawItem.year || rawItem.firstAirYear || null,
    description: rawItem.overview || rawItem.plot_overview || rawItem.summary || "",
    posterUrl:
      rawItem.poster ||
      rawItem.poster_url ||
      rawItem.imageSet?.verticalPoster?.w360 ||
      null,
    backdropUrl:
      rawItem.backdrop ||
      rawItem.backdrop_url ||
      rawItem.imageSet?.horizontalBackdrop?.w720 ||
      null,
    imdbId: rawItem.imdbId || rawItem.imdb_id || null,
    contentRating: rawItem.contentRating || rawItem.content_rating || null,
    streamingOn,
    source: "streaming",
  };
}

export function normalizeWatchmodeResponse(payload, services) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.titles)
      ? payload.titles
      : [];

  return dedupeItems(
    items.map((item) => {
      const sourceNames = Array.isArray(item.source_names)
        ? item.source_names
        : Array.isArray(item.sources)
          ? item.sources.map((source) => source.name).filter(Boolean)
          : services.map((service) => SERVICE_MAP[service].label);

      return normalizeItem(
        {
          ...item,
          showType: item.type,
          genres: item.genre_names || item.genres || [],
          rating: item.user_rating || item.critic_score || null,
          overview: item.plot_overview || item.overview,
          poster: item.poster || item.poster_url,
          tmdbId: item.tmdb_id || item.tmdbId || null,
          streamingOn: sourceNames,
        },
        SERVICE_MAP[services[0]].label
      );
    })
  );
}

export function normalizeRapidApiResponse(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.shows)
      ? payload.shows
      : Array.isArray(payload.results)
        ? payload.results
        : [];

  return dedupeItems(
    items.map((item) => {
      const streamingOn = Object.keys(item.streamingOptions?.us || {})
        .map(
          (serviceKey) =>
            Object.values(SERVICE_MAP).find((service) => service.rapidApi.startsWith(serviceKey))
              ?.label
        )
        .filter(Boolean);

      return normalizeItem(item, streamingOn[0] || "Streaming");
    })
  );
}
