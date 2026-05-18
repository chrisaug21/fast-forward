const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getServiceCacheKey(service) {
  return `streaming:us:${service}`;
}

export function isSourceCacheFresh(record) {
  return Boolean(record) && new Date(record.expires_at).getTime() > Date.now();
}

export function getCachedItems(record) {
  return Array.isArray(record?.data?.items) ? record.data.items : Array.isArray(record?.data) ? record.data : [];
}

export async function readSourceCache(client, cacheKey) {
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

export async function writeSourceCache(client, cacheKey, items, source) {
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
