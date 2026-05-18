import { mergeNormalizedItems } from "./streaming-normalize.js";
import { fetchWatchmodeCatalog } from "./streaming-sources.js";
import {
  getCachedItems,
  getServiceCacheKey,
  isSourceCacheFresh,
  readSourceCache,
  writeSourceCache,
} from "./source-cache.js";

const SERVICE_REFRESH_DELAY_MS = 500;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadSingleServiceCatalog(service, readClient, writeClient, env) {
  const cacheKey = getServiceCacheKey(service);
  let cached = null;

  try {
    cached = await readSourceCache(readClient, cacheKey);
  } catch (error) {
    console.warn(`fetch-streaming cache read failed for ${service}; continuing without cache`, error);
  }

  if (isSourceCacheFresh(cached)) {
    return {
      items: getCachedItems(cached),
      meta: {
        service,
        cacheKey,
        source: cached.data?.source || "watchmode",
        fetchedAt: cached.fetched_at,
        expiresAt: cached.expires_at,
        fromCache: true,
        usedStaleCache: false,
        error: null,
      },
    };
  }

  try {
    const items = await fetchWatchmodeCatalog(service, env);
    let cacheMeta = {
      fetchedAt: cached?.fetched_at || null,
      expiresAt: cached?.expires_at || null,
    };

    if (!writeClient) {
      console.warn("fetch-streaming cache write skipped; missing SUPABASE_SERVICE_ROLE_KEY");
    } else {
      try {
        cacheMeta = await writeSourceCache(writeClient, cacheKey, items, "watchmode");
      } catch (error) {
        console.warn(`fetch-streaming cache write failed for ${service}; continuing without cache`, error);
      }
    }

    return {
      items,
      meta: {
        service,
        cacheKey,
        source: "watchmode",
        fetchedAt: cacheMeta.fetchedAt,
        expiresAt: cacheMeta.expiresAt,
        fromCache: false,
        usedStaleCache: false,
        error: null,
      },
    };
  } catch (error) {
    const cachedItems = getCachedItems(cached);

    if (cachedItems.length > 0) {
      console.warn(
        `Watchmode refresh failed for ${service}; serving stale cache instead`,
        error
      );

      return {
        items: cachedItems,
        meta: {
          service,
          cacheKey,
          source: cached?.data?.source || "watchmode",
          fetchedAt: cached?.fetched_at || null,
          expiresAt: cached?.expires_at || null,
          fromCache: true,
          usedStaleCache: true,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    throw error;
  }
}

export async function loadSourceCatalog(services, readClient, writeClient, env) {
  const serviceResults = [];

  for (let index = 0; index < services.length; index += 1) {
    if (index > 0) {
      await delay(SERVICE_REFRESH_DELAY_MS);
    }

    serviceResults.push(
      await loadSingleServiceCatalog(services[index], readClient, writeClient, env)
    );
  }

  return {
    items: mergeNormalizedItems(serviceResults.flatMap((result) => result.items)),
    meta: serviceResults.map((result) => result.meta),
  };
}
