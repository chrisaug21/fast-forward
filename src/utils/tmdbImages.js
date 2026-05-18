const TMDB_IMAGE_PREFIX = "https://image.tmdb.org/t/p/";
const TMDB_CARD_POSTER_SIZE = "w185";

export function getCatalogPosterUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return null;
  }

  if (!url.startsWith(TMDB_IMAGE_PREFIX)) {
    return url;
  }

  const path = url.slice(TMDB_IMAGE_PREFIX.length).split("/");

  if (path.length < 2) {
    return url;
  }

  path[0] = TMDB_CARD_POSTER_SIZE;
  return `${TMDB_IMAGE_PREFIX}${path.join("/")}`;
}
