import { DEFAULT_EXCLUDED_LIBRARIES } from "./constants";

export async function fetchPlexLibrary(
  plexUrl,
  plexToken,
  excludedLibraries = DEFAULT_EXCLUDED_LIBRARIES
) {
  const baseUrl = plexUrl.replace(/\/$/, "");
  const headers = { "X-Plex-Token": plexToken, Accept: "application/json" };

  const librariesResponse = await fetch(
    `${baseUrl}/library/sections?X-Plex-Token=${plexToken}`,
    { headers }
  );

  if (!librariesResponse.ok) {
    throw new Error("Cannot reach Plex. Are you on your local network?");
  }

  const libraryData = await librariesResponse.json();
  const sections = libraryData?.MediaContainer?.Directory || [];
  const excludedLower = excludedLibraries.map((library) => library.toLowerCase());

  const mediaSections = sections.filter(
    (section) =>
      ["movie", "show"].includes(section.type) &&
      !excludedLower.includes((section.title || "").toLowerCase())
  );

  const allItems = [];

  for (const section of mediaSections) {
    const response = await fetch(
      `${baseUrl}/library/sections/${section.key}/all?X-Plex-Token=${plexToken}`,
      { headers }
    );

    if (!response.ok) {
      continue;
    }

    const data = await response.json();
    const items = data?.MediaContainer?.Metadata || [];

    items.forEach((item) => {
      allItems.push({
        id: `plex-${item.ratingKey}`,
        title: item.title,
        type: section.type === "movie" ? "Movie" : "TV Show",
        genres: (item.Genre || []).map((genre) => genre.tag),
        runtime: item.duration ? Math.round(item.duration / 60000) : null,
        imdbScore: item.rating,
        releaseYear: item.year,
        description: item.summary || "",
        posterUrl: item.thumb
          ? `${baseUrl}${item.thumb}?X-Plex-Token=${plexToken}`
          : null,
        streamingOn: ["Plex (Local)"],
        source: "plex",
      });
    });
  }

  return allItems;
}
