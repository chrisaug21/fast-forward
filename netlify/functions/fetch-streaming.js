import { createClient } from "@supabase/supabase-js";
import { filterTitlesByGenre } from "./catalog-filter.js";
import { fetchAllWatchmodeCatalog, fetchRapidApiCatalog } from "./streaming-sources.js";
import {
  buildTitleLookupKey,
  isTitleCacheStale,
  readTitleCache,
  titleCacheRowToItem,
  writeTitleCache,
} from "./title-cache.js";
import { enrichTitles } from "./tmdb-enrichment.js";
import { SERVICE_MAP } from "./streaming-normalize.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TMDB_ENRICHMENT_LIMIT = 150;
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
    .map((value) => (value === "apple" ? "apple_tv" : value))
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

function mergeCachedMetadata(rawItem, cachedRow) {
  const cachedItem = titleCacheRowToItem(cachedRow);

  return {
    ...rawItem,
    ...cachedItem,
    id: cachedRow.tmdb_id || rawItem.id,
    streamingOn: [
      ...new Set([...(rawItem.streamingOn || []), ...(cachedItem.streamingOn || [])]),
    ],
  };
}

async function enrichCatalogItems(items, readClient, writeClient) {
  let cachedRows = new Map();

  if (readClient) {
    try {
      cachedRows = await readTitleCache(readClient, items);
    } catch (error) {
      console.warn("titles_cache read failed; continuing without title cache", error);
    }
  }

  const itemsToEnrich = [];
  let overLimitCount = 0;
  let usedFreshTitleCacheCount = 0;
  let staleTitleCacheCount = 0;

  const combinedItems = items.map((item) => {
    const cachedRow = cachedRows.get(buildTitleLookupKey(item));

    if (cachedRow && !isTitleCacheStale(cachedRow)) {
      usedFreshTitleCacheCount += 1;
      return mergeCachedMetadata(item, cachedRow);
    }

    if (cachedRow) {
      staleTitleCacheCount += 1;
    }

    if (itemsToEnrich.length < TMDB_ENRICHMENT_LIMIT) {
      itemsToEnrich.push(item);
    } else {
      overLimitCount += 1;
    }

    return item;
  });

  if (overLimitCount > 0) {
    console.warn(
      `TMDB enrichment cap hit; ${overLimitCount} titles returned without enrichment this run`
    );
  }

  const enrichedItems = await enrichTitles(itemsToEnrich, env);

  if (writeClient && enrichedItems.length > 0) {
    try {
      await writeTitleCache(writeClient, enrichedItems);
    } catch (error) {
      console.warn("titles_cache write failed; continuing without title cache update", error);
    }
  }

  const enrichedByKey = new Map(
    enrichedItems.map((item) => [buildTitleLookupKey(item), item])
  );

  return {
    items: combinedItems.map(
      (item) => enrichedByKey.get(buildTitleLookupKey(item)) || item
    ),
    meta: {
      enrichedCount: enrichedItems.length,
      usedFreshTitleCacheCount,
      staleTitleCacheCount,
      overLimitCount,
    },
  };
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

  const writeClient = createSupabaseClient(env.SUPABASE_SERVICE_ROLE_KEY);
  const cacheKey = getCacheKey(services);
  let watchmodeFailure = null;

  try {
    let cached = null;

    try {
      cached = await readCache(readClient, cacheKey);
    } catch (cacheReadError) {
      console.warn("fetch-streaming cache read failed; continuing without cache", cacheReadError);
    }

    let sourceItems = null;
    let source = cached?.data?.source || "watchmode";
    let sourceCacheMeta = {
      fetchedAt: cached?.fetched_at || null,
      expiresAt: cached?.expires_at || null,
      fromCache: false,
    };

    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      sourceItems = Array.isArray(cached.data?.items) ? cached.data.items : cached.data;
      sourceCacheMeta.fromCache = true;
    } else {
      try {
        sourceItems = await fetchAllWatchmodeCatalog(services, env);
      } catch (watchmodeError) {
        console.warn("Watchmode failed, falling back to RapidAPI", watchmodeError);
        watchmodeFailure = getErrorMessage(watchmodeError);
        sourceItems = await fetchRapidApiCatalog(services, env);
        source = "rapidapi";
      }
    }

    if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
      return json(502, { error: "Streaming provider returned no results" });
    }

    if (!sourceCacheMeta.fromCache) {
      if (!writeClient) {
        console.warn("fetch-streaming cache write skipped; missing SUPABASE_SERVICE_ROLE_KEY");
      } else {
        try {
          sourceCacheMeta = {
            ...(await writeCache(writeClient, cacheKey, sourceItems, source)),
            fromCache: false,
          };
        } catch (cacheWriteError) {
          console.warn("fetch-streaming cache write failed; continuing without cache", cacheWriteError);
        }
      }
    }

    const {
      items: enrichedItems,
      meta: enrichmentMeta,
    } = await enrichCatalogItems(sourceItems, readClient, writeClient);
    const { kept: filteredItems, filteredOut } = filterTitlesByGenre(enrichedItems);
    console.log(`fetch-streaming filtered out ${filteredOut} titles by genre`);
    console.log("fetch-streaming source", source);

    return json(200, {
      items: filteredItems,
      meta: {
        cacheKey,
        source,
        fetchedAt: sourceCacheMeta.fetchedAt,
        expiresAt: sourceCacheMeta.expiresAt,
        fromCache: sourceCacheMeta.fromCache,
        enrichedCount: enrichmentMeta.enrichedCount,
        usedFreshTitleCacheCount: enrichmentMeta.usedFreshTitleCacheCount,
        staleTitleCacheCount: enrichmentMeta.staleTitleCacheCount,
        overLimitCount: enrichmentMeta.overLimitCount,
        filteredOutCount: filteredOut,
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
