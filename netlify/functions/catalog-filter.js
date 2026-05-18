const EXCLUDED_GENRES = new Set([
  "reality",
  "game show",
  "talk",
  "news",
  "sport",
  "kids",
  "documentary",
]);

function normalizeGenre(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function shouldExcludeByGenres(genres) {
  if (!Array.isArray(genres) || genres.length === 0) {
    return false;
  }

  const normalizedGenres = new Set(genres.map(normalizeGenre).filter(Boolean));

  if ([...normalizedGenres].some((genre) => EXCLUDED_GENRES.has(genre))) {
    return true;
  }

  return normalizedGenres.has("family") && !normalizedGenres.has("animation");
}

export function filterTitlesByGenre(items) {
  const kept = [];
  let filteredOut = 0;

  items.forEach((item) => {
    if (shouldExcludeByGenres(item.genres)) {
      filteredOut += 1;
      return;
    }

    kept.push(item);
  });

  return { kept, filteredOut };
}
