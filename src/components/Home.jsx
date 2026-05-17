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

      <div className="ff-panel">
        <div className="ff-section-label">Mood Match</div>
        <div className="ff-mood-row">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleGetRecommendations();
              }
            }}
            placeholder="e.g. something dark and tense, or a comedy under 2 hours..."
            className="ff-input"
          />
          <button
            onClick={handleGetRecommendations}
            disabled={recLoading || catalog.length === 0}
            className="ff-button-primary"
          >
            {recLoading ? (
              <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>
                thinking…
              </span>
            ) : (
              "Recommend"
            )}
          </button>
        </div>

        <div className="ff-chip-row">
          {QUICK_PROMPTS.map((quickPrompt) => (
            <button
              key={quickPrompt}
              onClick={() => {
                setPrompt(quickPrompt);
              }}
              className="ff-chip"
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
