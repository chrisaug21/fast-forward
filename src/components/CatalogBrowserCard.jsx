import { getCatalogPosterUrl } from "../utils/tmdbImages";

function formatRuntime(runtime) {
  return Number.isInteger(runtime) ? `${runtime}m` : null;
}

function buildMetaBadges(item) {
  return [formatRuntime(item.runtime), item.contentRating].filter(Boolean);
}

export default function CatalogBrowserCard({ item, onAddToWatchlist }) {
  const sourceLabel =
    item.source === "streaming" ? item.streamingOn?.[0] || "Streaming" : "Plex";
  const metaBadges = buildMetaBadges(item);
  const posterUrl = getCatalogPosterUrl(item.posterUrl);

  return (
    <button
      type="button"
      className="ff-card ff-card--catalog"
      onClick={() => onAddToWatchlist(item)}
      title="Click to add to watchlist"
    >
      <div className="ff-card-poster">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="ff-card-poster__image"
          />
        ) : (
          <div className="ff-card-poster__fallback">
            {item.type === "Movie" ? "Movie" : "Series"}
          </div>
        )}
      </div>

      <div className="ff-card-body">
        <div className="ff-card-title">{item.title}</div>

        <div className="ff-card-meta">
          <span>{item.releaseYear || "Unknown year"}</span>
          <span
            className={`ff-source-badge ${
              item.source === "streaming"
                ? "ff-source-badge--streaming"
                : "ff-source-badge--plex"
            }`}
          >
            {sourceLabel}
          </span>
        </div>

        {metaBadges.length > 0 && (
          <div className="ff-card-badges">
            {metaBadges.map((badge) => (
              <span key={badge} className="ff-chip ff-chip--static">
                {badge}
              </span>
            ))}
          </div>
        )}

        {item.imdbScore && <div className="ff-card-rating">★ {item.imdbScore}</div>}
      </div>
    </button>
  );
}
