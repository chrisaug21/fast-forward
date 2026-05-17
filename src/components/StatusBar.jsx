export default function StatusBar({
  catalog,
  streamingStatus,
  plexStatus,
  onLoadStreamingCatalog,
  onLoadPlex,
  streamingCacheAge,
}) {
  const plexCount = catalog.filter((item) => item.source === "plex").length;

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
      <div
        style={{
          flex: 1,
          minWidth: 200,
          background: "#0f0f18",
          border: "1px solid #1e1e2a",
          borderRadius: 4,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#555",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Streaming
          </div>
          <div style={{ fontSize: 13, color: "#aaa" }}>
            Max · Apple TV+
            {streamingCacheAge && (
              <span style={{ color: "#555", marginLeft: 8, fontSize: 11 }}>
                ({streamingCacheAge})
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onLoadStreamingCatalog}
          disabled={streamingStatus === "loading"}
          style={{
            background: "#1a1a28",
            border: "1px solid #2a2a3a",
            color: streamingStatus === "loading" ? "#555" : "#9090c0",
            padding: "5px 12px",
            borderRadius: 3,
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          {streamingStatus === "loading"
            ? "···"
            : streamingStatus === "ok"
              ? "↻ Refresh"
              : "↓ Fetch"}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 200,
          background: "#0f0f18",
          border: "1px solid #1e1e2a",
          borderRadius: 4,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#555",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Plex Library
          </div>
          <div style={{ fontSize: 13, color: "#aaa" }}>
            {plexCount > 0 ? `${plexCount} titles` : "Not loaded"}
          </div>
        </div>
        <button
          onClick={onLoadPlex}
          disabled={plexStatus === "loading"}
          style={{
            background: "#1a1a28",
            border: "1px solid #2a2a3a",
            color: plexStatus === "loading" ? "#555" : "#c09060",
            padding: "5px 12px",
            borderRadius: 3,
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          {plexStatus === "loading"
            ? "···"
            : plexStatus === "ok"
              ? "↻ Refresh"
              : "↓ Connect"}
        </button>
      </div>

      <div
        style={{
          background: "#0f0f18",
          border: "1px solid #1e1e2a",
          borderRadius: 4,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#555",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Total
          </div>
          <div style={{ fontSize: 20, color: "#e8e4dc", fontStyle: "italic" }}>
            {catalog.length}
          </div>
        </div>
      </div>
    </div>
  );
}
