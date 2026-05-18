import { STREAMING_SERVICES } from "./constants";

const REQUEST_TIMEOUT_MS = 10000;

export default async function fetchStreamingCatalog() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const services = STREAMING_SERVICES.map((service) => service.apiId).join(",");

  try {
    const response = await fetch("/.netlify/functions/fetch-streaming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.items?.titles)
        ? payload.items.titles
        : [];

    return {
      items,
      meta: payload.meta || null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
