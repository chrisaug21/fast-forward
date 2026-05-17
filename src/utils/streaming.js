import { STREAMING_SERVICES } from "./constants";

const REQUEST_DELAY_MS = 1000;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 10000;

const REQUESTS = [
  { service: "hbo", type: "movie" },
  { service: "hbo", type: "series" },
  { service: "apple", type: "movie" },
  { service: "apple", type: "series" },
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getServiceLabel(serviceId) {
  return (
    STREAMING_SERVICES.find((service) => service.jwId === serviceId)?.label ||
    serviceId
  );
}

async function fetchStreamingBatch(service, type, retries = 3) {
  const maxAttempts = Math.min(retries, 3);
  const url = "/.netlify/functions/streaming";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, type }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid streaming response");
      }

      return data;
    } catch {
      clearTimeout(timeoutId);

      if (attempt === maxAttempts - 1) {
        throw new Error(
          `Streaming catalog request failed after 3 attempts for ${service} ${type}`
        );
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(
    `Streaming catalog request failed after 3 attempts for ${service} ${type}`
  );
}

export default async function fetchStreamingCatalog() {
  const combinedShows = new Map();

  for (let index = 0; index < REQUESTS.length; index += 1) {
    const request = REQUESTS[index];
    const serviceLabel = getServiceLabel(request.service);
    const shows = await fetchStreamingBatch(request.service, request.type);

    shows.forEach((show) => {
      const dedupeKey =
        show.tmdbId ??
        `${request.service}:${request.type}:${show.title}:${show.releaseYear || show.firstAirYear || "unknown"}`;

      if (!combinedShows.has(dedupeKey)) {
        combinedShows.set(dedupeKey, {
          show,
          streamingOn: new Set([serviceLabel]),
        });
        return;
      }

      combinedShows.get(dedupeKey).streamingOn.add(serviceLabel);
    });

    if (index < REQUESTS.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return Array.from(combinedShows.values()).map(({ show, streamingOn }) => ({
    id: show.tmdbId,
    title: show.title,
    type: show.showType === "series" ? "TV Show" : "Movie",
    genres: show.genres?.map((genre) => genre.name) || [],
    runtime: show.runtime || null,
    imdbScore: show.rating ? show.rating / 10 : null,
    releaseYear: show.releaseYear || show.firstAirYear || null,
    description: show.overview || "",
    posterUrl: show.imageSet?.verticalPoster?.w360 || null,
    streamingOn: Array.from(streamingOn),
    source: "streaming",
  }));
}
