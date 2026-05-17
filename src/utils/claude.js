export async function getRecommendations({ prompt, catalog, watchlist, watched }) {
  const catalogSummary = catalog
    .slice(0, 300)
    .map(
      (title) =>
        `- "${title.title}" (${title.type}, ${title.releaseYear || "?"}, ${title.streamingOn.join("/")}, IMDb: ${title.imdbScore || "?"}, Genres: ${title.genres.slice(0, 3).join(", ")})`
    )
    .join("\n");

  const watchedTitles = watched.map((item) => item.title).join(", ") || "none yet";
  const watchlistTitles =
    watchlist.map((item) => item.title).join(", ") || "none yet";

  const systemPrompt = `You are a personalized movie and TV recommendation assistant. You have access to the user's available content catalog spanning their Plex library and streaming services.

Available catalog (${catalog.length} titles total, showing sample):
${catalogSummary}

User's watchlist: ${watchlistTitles}
User's watched history: ${watchedTitles}

Return ONLY valid JSON. No markdown fences, no preamble. Format:
{
  "recommendations": [
    {
      "title": "exact title from catalog",
      "reason": "2-3 sentence personalized reason",
      "where": "streaming service or Plex (Local)",
      "mood": "one-word mood tag"
    }
  ],
  "message": "brief friendly intro (1 sentence)"
}

Rules:
- Only recommend titles that exist EXACTLY in the catalog
- Give 5-8 recommendations
- Vary sources (mix Plex and streaming when possible)
- Factor in watched history (don't repeat those)
- Be specific and personalized in reasons`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt || "What should I watch tonight?" }],
    }),
  });

  const data = await response.json();
  const text = data.content?.find((block) => block.type === "text")?.text || "{}";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
