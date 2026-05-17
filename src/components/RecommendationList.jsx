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
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "#555",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Recommendations
      </div>
      {recommendations.message && (
        <div
          style={{
            color: "#888",
            fontSize: 13,
            fontStyle: "italic",
            marginBottom: 14,
          }}
        >
          {recommendations.message}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
            <div
              key={index}
              style={{
                background: "#0c0c16",
                border: "1px solid #1a1a24",
                borderRadius: 4,
                padding: "14px 18px",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = "#2a2a3a";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = "#1a1a24";
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: "#333",
                  minWidth: 36,
                  textAlign: "center",
                  paddingTop: 2,
                  fontStyle: "italic",
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 15, color: "#e8e4dc" }}>
                    {recommendation.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#555",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    {recommendation.where}
                  </span>
                  {recommendation.mood && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#404060",
                        border: "1px solid #252540",
                        padding: "1px 6px",
                        borderRadius: 2,
                      }}
                    >
                      {recommendation.mood}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#777", lineHeight: 1.5 }}>
                  {recommendation.reason}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, paddingTop: 2 }}>
                {item && (
                  <>
                    <button
                      onClick={() => onAddToWatchlist(item)}
                      title="Add to watchlist"
                      style={{
                        background: "transparent",
                        border: "1px solid #252535",
                        color: "#555",
                        width: 28,
                        height: 28,
                        borderRadius: 3,
                        fontSize: 14,
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => onMarkWatched(item)}
                      title="Mark watched"
                      style={{
                        background: "transparent",
                        border: "1px solid #252535",
                        color: "#555",
                        width: 28,
                        height: 28,
                        borderRadius: 3,
                        fontSize: 12,
                      }}
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
