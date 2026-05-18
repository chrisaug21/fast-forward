const TITLE_CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const TITLE_QUERY_CHUNK_SIZE = 100;

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeCatalogType(value) {
  const normalized = normalizeText(value);
  return normalized === "tv show" || normalized === "show" ? "show" : "movie";
}

export function buildTitleLookupKey({ title, type, releaseYear }) {
  return [
    normalizeText(title),
    normalizeCatalogType(type),
    Number.isInteger(releaseYear) ? String(releaseYear) : "",
  ].join("::");
}

export function isTitleCacheStale(record) {
  if (!record?.fetched_at) {
    return true;
  }

  return Date.now() - new Date(record.fetched_at).getTime() >= TITLE_CACHE_STALE_MS;
}

export function titleCacheRowToItem(row) {
  return {
    id: row.tmdb_id || row.lookup_key,
    tmdbId: row.tmdb_id || null,
    title: row.title,
    type: row.type === "show" ? "TV Show" : "Movie",
    releaseYear: row.release_year,
    genres: Array.isArray(row.genres) ? row.genres : [],
    overview: row.overview || "",
    description: row.overview || "",
    runtime: row.runtime,
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    imdbId: row.imdb_id,
    contentRating: row.content_rating,
    streamingOn: Array.isArray(row.streaming_on) ? row.streaming_on : [],
    source: "streaming",
  };
}

export function itemToTitleCacheRow(item) {
  return {
    lookup_key: buildTitleLookupKey(item),
    tmdb_id: item.tmdbId ?? null,
    title: item.title,
    type: normalizeCatalogType(item.type),
    release_year: item.releaseYear ?? null,
    genres: Array.isArray(item.genres) ? item.genres : null,
    overview: item.overview || null,
    runtime: item.runtime ?? null,
    poster_url: item.posterUrl || null,
    backdrop_url: item.backdropUrl || null,
    imdb_id: item.imdbId || null,
    content_rating: item.contentRating || null,
    streaming_on: Array.isArray(item.streamingOn) ? item.streamingOn : [],
    fetched_at: new Date().toISOString(),
  };
}

export async function readTitleCache(client, items) {
  const uniqueTitles = [...new Set(items.map((item) => item.title).filter(Boolean))];
  const rows = [];

  for (let index = 0; index < uniqueTitles.length; index += TITLE_QUERY_CHUNK_SIZE) {
    const chunk = uniqueTitles.slice(index, index + TITLE_QUERY_CHUNK_SIZE);
    const { data, error } = await client
      .from("titles_cache")
      .select(
        [
          "lookup_key",
          "tmdb_id",
          "title",
          "type",
          "release_year",
          "genres",
          "overview",
          "runtime",
          "poster_url",
          "backdrop_url",
          "imdb_id",
          "content_rating",
          "streaming_on",
          "fetched_at",
        ].join(",")
      )
      .in("title", chunk);

    if (error) {
      throw error;
    }

    rows.push(...(data || []));
  }

  return rows.reduce((map, row) => {
    const key = row.lookup_key || buildTitleLookupKey(row);
    const existing = map.get(key);

    if (!existing || new Date(row.fetched_at).getTime() > new Date(existing.fetched_at).getTime()) {
      map.set(key, row);
    }

    return map;
  }, new Map());
}

export async function writeTitleCache(client, items) {
  if (items.length === 0) {
    return;
  }

  const rows = items.map(itemToTitleCacheRow);
  const { error } = await client
    .from("titles_cache")
    .upsert(rows, { onConflict: "lookup_key" });

  if (error) {
    throw error;
  }
}
