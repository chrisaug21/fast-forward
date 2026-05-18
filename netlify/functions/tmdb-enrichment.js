import { normalizeCatalogType } from "./title-cache.js";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const TMDB_DELAY_MS = 100;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildImageUrl(size, path) {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}

function getContentRating(type, payload) {
  if (type === "movie") {
    const usRelease = payload.release_dates?.results?.find((item) => item.iso_3166_1 === "US");
    return usRelease?.release_dates?.find((item) => item.certification)?.certification || null;
  }

  return (
    payload.content_ratings?.results?.find((item) => item.iso_3166_1 === "US")?.rating || null
  );
}

function buildBaseItem(item) {
  const normalizedType = normalizeCatalogType(item.type);

  return {
    id: item.id || item.tmdbId || `${item.title}:${normalizedType}:${item.releaseYear || "unknown"}`,
    tmdbId: item.tmdbId ?? null,
    title: item.title,
    type: normalizedType === "show" ? "TV Show" : "Movie",
    releaseYear: item.releaseYear ?? null,
    genres: Array.isArray(item.genres) ? item.genres : [],
    overview: item.overview || item.description || "",
    description: item.overview || item.description || "",
    runtime: item.runtime ?? null,
    posterUrl: item.posterUrl || null,
    backdropUrl: item.backdropUrl || null,
    imdbId: item.imdbId || null,
    contentRating: item.contentRating || null,
    streamingOn: Array.isArray(item.streamingOn) ? item.streamingOn : [],
    source: "streaming",
  };
}

function pickBestSearchResult(payload, type) {
  const results = Array.isArray(payload.results) ? payload.results : [];

  if (type === "movie") {
    return results.find((result) => result.media_type !== "tv") || null;
  }

  return results.find((result) => result.media_type !== "movie") || null;
}

function mergeTmdbData(baseItem, payload, type) {
  const runtime =
    type === "movie"
      ? payload.runtime ?? baseItem.runtime
      : Array.isArray(payload.episode_run_time) && payload.episode_run_time.length > 0
        ? payload.episode_run_time[0]
        : baseItem.runtime;

  const overview = payload.overview || baseItem.overview || "";
  const releaseDate = payload.release_date || payload.first_air_date || "";
  const releaseYear = releaseDate
    ? Number.parseInt(releaseDate.slice(0, 4), 10)
    : baseItem.releaseYear;

  return {
    ...baseItem,
    id: payload.id || baseItem.id,
    tmdbId: payload.id || baseItem.tmdbId,
    title: baseItem.title,
    releaseYear: baseItem.releaseYear ?? (Number.isInteger(releaseYear) ? releaseYear : null),
    genres: Array.isArray(payload.genres)
      ? payload.genres.map((genre) => genre.name).filter(Boolean)
      : baseItem.genres,
    overview,
    description: overview,
    runtime: runtime ?? null,
    posterUrl: buildImageUrl("w500", payload.poster_path) || baseItem.posterUrl,
    backdropUrl: buildImageUrl("w780", payload.backdrop_path) || baseItem.backdropUrl,
    imdbId: payload.external_ids?.imdb_id || baseItem.imdbId,
    contentRating: getContentRating(type, payload) || baseItem.contentRating,
  };
}

async function fetchTmdb(url, env) {
  if (!env.TMDB_API_KEY) {
    throw new Error("Missing TMDB_API_KEY");
  }

  const response = await fetch(url.toString(), { method: "GET" });

  if (!response.ok) {
    throw new Error(`TMDB returned HTTP ${response.status}`);
  }

  return response.json();
}

async function enrichTitle(item, env) {
  const baseItem = buildBaseItem(item);
  const type = normalizeCatalogType(item.type);

  if (Number.isInteger(item.tmdbId)) {
    const detailsUrl = new URL(
      `${TMDB_API_BASE_URL}/${type === "movie" ? "movie" : "tv"}/${item.tmdbId}`
    );
    detailsUrl.searchParams.set("api_key", env.TMDB_API_KEY);
    detailsUrl.searchParams.set(
      "append_to_response",
      type === "movie" ? "external_ids,release_dates" : "external_ids,content_ratings"
    );

    return mergeTmdbData(baseItem, await fetchTmdb(detailsUrl, env), type);
  }

  const searchUrl = new URL(
    `${TMDB_API_BASE_URL}/search/${type === "movie" ? "movie" : "tv"}`
  );
  searchUrl.searchParams.set("api_key", env.TMDB_API_KEY);
  searchUrl.searchParams.set("query", item.title);
  searchUrl.searchParams.set("include_adult", "false");

  if (Number.isInteger(item.releaseYear)) {
    searchUrl.searchParams.set(
      type === "movie" ? "year" : "first_air_date_year",
      String(item.releaseYear)
    );
  }

  const payload = await fetchTmdb(searchUrl, env);
  const match = pickBestSearchResult(payload, type);

  if (!match) {
    return baseItem;
  }

  return mergeTmdbData(baseItem, match, type);
}

export async function enrichTitles(items, env) {
  const enriched = [];

  for (let index = 0; index < items.length; index += 1) {
    if (index > 0) {
      await delay(TMDB_DELAY_MS);
    }

    try {
      enriched.push(await enrichTitle(items[index], env));
    } catch (error) {
      console.warn(`TMDB enrichment failed for "${items[index].title}"`, error);
      enriched.push(buildBaseItem(items[index]));
    }
  }

  return enriched;
}
