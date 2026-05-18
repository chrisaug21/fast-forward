import { enrichTitles } from "./tmdb-enrichment.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const titles = Array.isArray(payload.titles) ? payload.titles : [];

    if (titles.length === 0) {
      return json(400, { error: "Missing titles array" });
    }

    return json(200, {
      items: await enrichTitles(titles, globalThis.process?.env ?? {}),
    });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
