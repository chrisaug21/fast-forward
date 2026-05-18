import { createClient } from "@supabase/supabase-js";
import {
  mergeNormalizedItems,
  normalizeRapidApiResponse,
  normalizeWatchmodeResponse,
  SERVICE_MAP,
} from "./streaming-normalize.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const WATCHMODE_MAX_PAGES = 5;
const WATCHMODE_PAGE_SIZE = 250;
const TIMEOUT_MS = 10000;
const WATCHMODE_URL = "https://api.watchmode.com/v1/list-titles/";
const RAPIDAPI_URL = "https://streaming-availability.p.rapidapi.com/shows/search/filters";
const env = globalThis.process?.env ?? {};
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

function parseServices(event) {
  if (event.httpMethod === "GET") {
    return event.queryStringParameters?.services || "";
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    return payload.services || "";
  } catch {
    return "";
  }
}

function normalizeServices(rawServices) {
  const services = rawServices
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(services.filter((service) => SERVICE_MAP[service]))].sort();
}

function getCacheKey(services) {
  return `streaming:us:${services.join(",")}`;
}

function createSupabaseClient(key) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function withTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWatchmodeCatalog(service) {
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

async function fetchAllWatchmodeCatalog(services) {
  const providerItems = await Promise.all(
    services.map((service) => fetchWatchmodeCatalog(service))
  );

  return mergeNormalizedItems(providerItems.flat());
}

async function fetchRapidApiCatalog(services) {
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

async function readCache(client, cacheKey) {
  const { data, error } = await client
    .from("streaming_cache")
    .select("cache_key,data,fetched_at,expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function writeCache(client, cacheKey, items, source) {
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  const { error } = await client.from("streaming_cache").upsert(
    {
      cache_key: cacheKey,
      data: { items, source },
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" }
  );

  if (error) {
    throw error;
  }

  return { fetchedAt, expiresAt };
}

export async function handler(event) {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return json(405, { error: "Method not allowed" });
  }

  const services = normalizeServices(parseServices(event));

  if (services.length === 0) {
    return json(400, { error: "Missing or invalid services parameter" });
  }

  const readClient = createSupabaseClient(
    env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  );

  if (!readClient) {
    return json(500, { error: "Supabase environment variables are missing" });
  }

  const writeClient = createSupabaseClient(
    env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY
  );
  const cacheKey = getCacheKey(services);
  let watchmodeFailure = null;

  try {
    const cached = await readCache(readClient, cacheKey);

    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      return json(200, {
        items: Array.isArray(cached.data?.items) ? cached.data.items : cached.data,
        meta: {
          cacheKey,
          source: cached.data?.source || "cache",
          fetchedAt: cached.fetched_at,
          expiresAt: cached.expires_at,
          fromCache: true,
        },
      });
    }

    let items;
    let source = "watchmode";

    try {
      items = await fetchAllWatchmodeCatalog(services);
    } catch (watchmodeError) {
      console.warn("Watchmode failed, falling back to RapidAPI", watchmodeError);
      watchmodeFailure = getErrorMessage(watchmodeError);
      items = await fetchRapidApiCatalog(services);
      source = "rapidapi";
    }

    if (!Array.isArray(items) || items.length === 0) {
      return json(502, { error: "Streaming provider returned no results" });
    }

    const cacheMeta = await writeCache(writeClient, cacheKey, items, source);
    console.log("fetch-streaming source", source);

    return json(200, {
      items,
      meta: {
        cacheKey,
        source,
        fetchedAt: cacheMeta.fetchedAt,
        expiresAt: cacheMeta.expiresAt,
        fromCache: false,
      },
    });
  } catch (error) {
    console.error("fetch-streaming failed", error);
    return json(500, {
      error: getErrorMessage(error),
      watchmodeError: watchmodeFailure,
    });
  }
}
