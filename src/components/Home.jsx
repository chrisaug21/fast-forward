import { useState } from "react";
import { getRecommendations } from "../utils/claude";
import CatalogBrowser from "./CatalogBrowser";
import RecommendationList from "./RecommendationList";
import StatusBar from "./StatusBar";

const QUICK_PROMPTS = [
  "Tonight's top pick",
  "Something short",
  "Hidden gem",
  "Best rated",
  "Comfort rewatch",
];

export default function Home({
  catalog,
  watchlist,
  watched,
  streamingStatus,
  plexStatus,
  onLoadStreamingCatalog,
  onLoadPlex,
  streamingCacheAge,
  onAddToWatchlist,
  onMarkWatched,
  onNotify,
}) {
  const [prompt, setPrompt] = useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  async function handleGetRecommendations() {
    if (catalog.length === 0) {
      onNotify("Load your catalog first", "error");
      return;
    }

    setRecLoading(true);
    setRecommendations(null);

    try {
      const result = await getRecommendations({ prompt, catalog, watchlist, watched });
      setRecommendations(result);
    } catch {
      onNotify("Recommendation fetch failed", "error");
    }

    setRecLoading(false);
  }

  return (
    <div>
      <StatusBar
        catalog={catalog}
        streamingStatus={streamingStatus}
        plexStatus={plexStatus}
        onLoadStreamingCatalog={onLoadStreamingCatalog}
        onLoadPlex={onLoadPlex}
        streamingCacheAge={streamingCacheAge}
      />

      <div
        style={{
          background: "#0c0c16",
          border: "1px solid #1e1e2a",
          borderRadius: 4,
          padding: "20px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "#555",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          What are you in the mood for?
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleGetRecommendations();
              }
            }}
            placeholder="e.g. something dark and tense, or a comedy under 2 hours..."
            style={{
              flex: 1,
              background: "#0a0a12",
              border: "1px solid #252535",
              borderRadius: 3,
              padding: "10px 14px",
              color: "#e8e4dc",
              fontSize: 14,
              fontFamily: "Georgia, serif",
              letterSpacing: "0.02em",
            }}
          />
          <button
            onClick={handleGetRecommendations}
            disabled={recLoading || catalog.length === 0}
            style={{
              background: recLoading ? "#1a1a28" : "#2a2a4a",
              border: "1px solid #3a3a6a",
              color: recLoading ? "#555" : "#a0a0e0",
              padding: "10px 20px",
              borderRadius: 3,
              fontSize: 13,
              letterSpacing: "0.1em",
              transition: "all 0.15s",
            }}
          >
            {recLoading ? (
              <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>
                thinking…
              </span>
            ) : (
              "Recommend →"
            )}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {QUICK_PROMPTS.map((quickPrompt) => (
            <button
              key={quickPrompt}
              onClick={() => {
                setPrompt(quickPrompt);
              }}
              style={{
                background: "transparent",
                border: "1px solid #252530",
                color: "#555",
                padding: "4px 10px",
                borderRadius: 2,
                fontSize: 11,
                letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}
              onMouseEnter={(event) => {
                event.target.style.borderColor = "#404060";
                event.target.style.color = "#888";
              }}
              onMouseLeave={(event) => {
                event.target.style.borderColor = "#252530";
                event.target.style.color = "#555";
              }}
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>

      <RecommendationList
        recommendations={recommendations}
        catalog={catalog}
        onAddToWatchlist={onAddToWatchlist}
        onMarkWatched={onMarkWatched}
      />

      <CatalogBrowser catalog={catalog} onAddToWatchlist={onAddToWatchlist} />
    </div>
  );
}
