export const SERVICE_MAP = {
  max: { label: "Max", watchmode: "max", rapidApi: "max.subscription" },
  apple_tv: { label: "Apple TV+", watchmode: "appletvplus", rapidApi: "apple.subscription" },
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
      deduped.set(key, { ...item, streamingOn: [...item.streamingOn] });
      return;
    }

    existing.streamingOn = [...new Set([...existing.streamingOn, ...item.streamingOn])];
  });

  return [...deduped.values()];
}

function normalizeItem(rawItem, fallbackServiceLabel) {
  const rawType = rawItem.showType || rawItem.type || rawItem.tmdbType || rawItem.media_type;
  const isSeries = rawType === "series" || rawType === "tv_series" || rawType === "show";
  const streamingOn =
    Array.isArray(rawItem.streamingOn) && rawItem.streamingOn.length > 0
      ? rawItem.streamingOn
      : [fallbackServiceLabel];

  return {
    id: rawItem.tmdbId || rawItem.tmdb_id || rawItem.id || null,
    title: rawItem.title || rawItem.name || "Unknown title",
    type: isSeries ? "TV Show" : "Movie",
    genres: Array.isArray(rawItem.genres)
      ? rawItem.genres.map((genre) => genre.name || genre).filter(Boolean)
      : [],
    runtime: rawItem.runtime || rawItem.runtime_minutes || null,
    imdbScore: rawItem.rating ? Number(rawItem.rating) / 10 : rawItem.imdbRating || null,
    releaseYear: rawItem.releaseYear || rawItem.year || rawItem.firstAirYear || null,
    description: rawItem.overview || rawItem.plot_overview || rawItem.summary || "",
    posterUrl:
      rawItem.poster ||
      rawItem.poster_url ||
      rawItem.imageSet?.verticalPoster?.w360 ||
      null,
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
