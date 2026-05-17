const STREAMING_API_URL =
  "https://streaming-availability.p.rapidapi.com/shows/search/filters";
const MAX_PAGES = 5;
const ALLOWED_GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "documentary",
  "drama",
  "family",
  "fantasy",
  "history",
  "horror",
  "music",
  "mystery",
  "romance",
  "scifi",
  "thriller",
  "war",
  "western",
];
const SERVICE_MAP = {
  max: "hbo",
  hbo: "hbo",
  apple: "apple",
};
const TYPE_MAP = {
  movie: "movie",
  series: "series",
};
const RAPIDAPI_KEY = globalThis.process?.env?.RAPIDAPI_KEY;

function getRequestUrl(service, type, cursor) {
  const url = new URL(STREAMING_API_URL);

  url.searchParams.set("country", "us");
  url.searchParams.set("catalogs", service);
  url.searchParams.set("show_type", type);
  url.searchParams.set("order_by", "popularity_1year");
  url.searchParams.set("show_original_language", "en");
  url.searchParams.set("rating_min", "40");
  url.searchParams.set("genres_relation", "or");
  url.searchParams.set("genres", ALLOWED_GENRES.join(","));

  if (type === "series") {
    url.searchParams.set("series_granularity", "show");
  }

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  return url.toString();
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!RAPIDAPI_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing RAPIDAPI_KEY" }),
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const service = SERVICE_MAP[payload.service];
  const type = TYPE_MAP[payload.type];

  if (!service || !type) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid service or type" }),
    };
  }

  const results = [];
  let cursor = null;

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await fetch(getRequestUrl(service, type, cursor), {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        return {
          statusCode: response.status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Streaming Availability request failed",
            details: errorText || `HTTP ${response.status}`,
          }),
        };
      }

      const data = await response.json();
      const pageResults = Array.isArray(data)
        ? data
        : Array.isArray(data.shows)
          ? data.shows
          : Array.isArray(data.results)
            ? data.results
            : [];

      results.push(
        ...pageResults.map((show) => ({
          tmdbId: show.tmdbId,
          title: show.title,
          showType: show.showType,
          genres: Array.isArray(show.genres)
            ? show.genres.map((genre) => ({ name: genre.name }))
            : [],
          runtime: show.runtime,
          rating: show.rating,
          releaseYear: show.releaseYear,
          firstAirYear: show.firstAirYear,
          overview: show.overview,
          imageSet: {
            verticalPoster: {
              w360: show.imageSet?.verticalPoster?.w360 || null,
            },
          },
          streamingOptions: show.streamingOptions?.us || {},
        }))
      );

      if (!data.nextCursor) {
        break;
      }

      cursor = data.nextCursor;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to reach upstream service",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}
