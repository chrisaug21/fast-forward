const STREAMING_API_URL =
  "https://streaming-availability.p.rapidapi.com/shows/search/filters";
const MAX_PAGES = 40;
const SERVICE_MAP = {
  max: "hbo",
  hbo: "hbo",
  apple: "apple",
};
const TYPE_MAP = {
  movie: "movie",
  series: "series",
};

function getRequestUrl(service, type, cursor) {
  const url = new URL(STREAMING_API_URL);

  url.searchParams.set("country", "us");
  url.searchParams.set("catalogs", service);
  url.searchParams.set("show_type", type);
  url.searchParams.set("order_by", "popularity_1year");
  url.searchParams.set("show_original_language", "en");

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

  if (!process.env.RAPIDAPI_KEY) {
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
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
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

      results.push(...pageResults);

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
