import {
  normalizeWatchmodeResponse,
  SERVICE_MAP,
} from "./streaming-normalize.js";

const WATCHMODE_MAX_PAGES = 5;
const WATCHMODE_PAGE_SIZE = 250;
const TIMEOUT_MS = 10000;
const WATCHMODE_PAGE_DELAY_MS = 300;
const WATCHMODE_RETRY_DELAY_MS = 2000;
const WATCHMODE_URL = "https://api.watchmode.com/v1/list-titles/";

async function withTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWatchmodePage(url, page, service) {
  const response = await withTimeout(url.toString(), { method: "GET" });

  if (response.status === 429) {
    console.warn(`Watchmode rate limited ${service} page ${page}; retrying after backoff`);
    await delay(WATCHMODE_RETRY_DELAY_MS);
    const retryResponse = await withTimeout(url.toString(), { method: "GET" });

    if (!retryResponse.ok) {
      throw new Error(`Watchmode returned HTTP ${retryResponse.status}`);
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    throw new Error(`Watchmode returned HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchWatchmodeCatalog(service, env) {
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
    const payload = await fetchWatchmodePage(url, page, service);
    const pageTitles = Array.isArray(payload.titles) ? payload.titles : [];
    titles.push(...pageTitles);

    if (!payload.total_pages || page >= payload.total_pages || pageTitles.length === 0) {
      break;
    }

    await delay(WATCHMODE_PAGE_DELAY_MS);
  }

  return normalizeWatchmodeResponse({ titles }, [service]);
}
