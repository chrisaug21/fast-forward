import {
  mergeNormalizedItems,
  normalizeRapidApiResponse,
  normalizeWatchmodeResponse,
  SERVICE_MAP,
} from "./streaming-normalize.js";

const WATCHMODE_MAX_PAGES = 5;
const WATCHMODE_PAGE_SIZE = 250;
const TIMEOUT_MS = 10000;
const WATCHMODE_URL = "https://api.watchmode.com/v1/list-titles/";
const RAPIDAPI_URL =
  "https://streaming-availability.p.rapidapi.com/shows/search/filters";

async function withTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWatchmodeCatalog(service, env) {
  if (!env.WATCHMODE_API_KEY) {
    throw new Error("Missing WATCHMODE_API_KEY");
  }

  const titles = [];

  for (let page = 1; page <= WATCHMODE_MAX_PAGES; page += 1) {
    const url = new URL(WATCHMODE_URL);
    url.searchParams.set("apiKey", env.WATCHMODE_API_KEY);
    url.searchParams.set("regions", "US");
    url.searchParams.set("source_types", "sub");
    url.searchParams.set("source_ids", SERVICE_MAP[service].watchmode);
    url.searchParams.set("types", "movie,tv_series,tv_miniseries");
    url.searchParams.set("sort_by", "popularity_desc");
    url.searchParams.set("limit", String(WATCHMODE_PAGE_SIZE));
    url.searchParams.set("page", String(page));

    console.warn(
      `fetch-streaming is making a live Watchmode API call for ${service} (page ${page})`
    );
    const response = await withTimeout(url.toString(), { method: "GET" });

    if (!response.ok) {
      throw new Error(`Watchmode returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const pageTitles = Array.isArray(payload.titles) ? payload.titles : [];
    titles.push(...pageTitles);

    if (!payload.total_pages || page >= payload.total_pages || pageTitles.length === 0) {
      break;
    }
  }

  return normalizeWatchmodeResponse({ titles }, [service]);
}

export async function fetchAllWatchmodeCatalog(services, env) {
  const providerItems = await Promise.all(
    services.map((service) => fetchWatchmodeCatalog(service, env))
  );

  return mergeNormalizedItems(providerItems.flat());
}

export async function fetchRapidApiCatalog(services, env) {
  if (!env.RAPIDAPI_KEY) {
    throw new Error("Missing RAPIDAPI_KEY");
  }

  const url = new URL(RAPIDAPI_URL);
  url.searchParams.set("country", "us");
  url.searchParams.set(
    "catalogs",
    services.map((service) => SERVICE_MAP[service].rapidApi).join(",")
  );
  url.searchParams.set("series_granularity", "show");
  url.searchParams.set("output_language", "en");

  console.warn("fetch-streaming is making a live RapidAPI call");
  const response = await withTimeout(url.toString(), {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    throw new Error(`RapidAPI returned HTTP ${response.status}`);
  }

  return normalizeRapidApiResponse(await response.json());
}
