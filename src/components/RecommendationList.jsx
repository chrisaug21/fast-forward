export default function RecommendationList({
  recommendations,
  catalog,
  onAddToWatchlist,
  onMarkWatched,
}) {
  if (!recommendations) {
    return null;
  }

  return (
    <div className="ff-recommendations">
      <div className="ff-section-label">Recommendations</div>
      {recommendations.message && (
        <div className="ff-recommendation-note">{recommendations.message}</div>
      )}
      <div className="ff-recommendation-list">
        {(recommendations.recommendations || []).map((recommendation, index) => {
          const recommendationTitle =
            typeof recommendation?.title === "string" ? recommendation.title : null;
          const item = recommendationTitle
            ? catalog.find((catalogItem) => {
                if (typeof catalogItem?.title !== "string") {
                  return false;
                }

                return (
                  catalogItem.title.toLowerCase() === recommendationTitle.toLowerCase()
                );
              })
            : null;

          return (
            <div key={index} className="ff-recommendation-card">
              <div className="ff-recommendation-rank">{index + 1}</div>
              <div className="ff-recommendation-body">
                <div className="ff-recommendation-heading">
                  <span className="ff-recommendation-title">{recommendation.title}</span>
                  <span className="ff-recommendation-where">{recommendation.where}</span>
                  {recommendation.mood && (
                    <span className="ff-recommendation-mood">{recommendation.mood}</span>
                  )}
                </div>
                <div className="ff-recommendation-reason">{recommendation.reason}</div>
              </div>
              <div className="ff-recommendation-actions">
                {item && (
                  <>
                    <button
                      onClick={() => onAddToWatchlist(item)}
                      title="Add to watchlist"
                      className="ff-icon-button"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onMarkWatched(item)}
                      title="Mark watched"
                      className="ff-icon-button"
                    >
                      ✓
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
