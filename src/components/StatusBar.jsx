export default function StatusBar({
  catalog,
  streamingStatus,
  plexStatus,
  onLoadStreamingCatalog,
  onLoadPlex,
  streamingCacheAge,
}) {
  const streamingCount = catalog.filter((item) => item.source === "streaming").length;
  const plexCount = catalog.filter((item) => item.source === "plex").length;
  const streamingServices = [
    ...new Set(
      catalog
        .filter((item) => item.source === "streaming")
        .flatMap((item) =>
          Array.isArray(item.streamingOn)
            ? item.streamingOn
            : item.streamingOn
              ? [item.streamingOn]
              : []
        )
        .filter(Boolean)
    ),
  ];
  const streamingServicesLabel =
    streamingServices.length > 0 ? streamingServices.join(" · ") : "not loaded yet";

  return (
    <div className="ff-status-grid">
      <div className="ff-status-card">
        <div className="ff-status-label">Streaming</div>
        <div className="ff-status-value">{streamingCount}</div>
        <div className="ff-status-subtext">
          {streamingServicesLabel}
          {streamingCacheAge ? ` · ${streamingCacheAge}` : ""}
        </div>
        <div className="ff-status-action">
          <button
            onClick={onLoadStreamingCatalog}
            disabled={streamingStatus === "loading"}
            className="ff-button-secondary"
          >
            {streamingStatus === "loading"
              ? "Loading"
              : streamingStatus === "ok"
                ? "Refresh"
                : "Fetch"}
          </button>
        </div>
      </div>

      <div className="ff-status-card">
        <div className="ff-status-label">Plex Library</div>
        <div className="ff-status-value">{plexCount}</div>
        <div className="ff-status-subtext">
          {plexCount > 0 ? "movies & shows" : "not loaded yet"}
        </div>
        <div className="ff-status-action">
          <button
            onClick={onLoadPlex}
            disabled={plexStatus === "loading"}
            className="ff-button-secondary"
          >
            {plexStatus === "loading"
              ? "Loading"
              : plexStatus === "ok"
                ? "Refresh"
                : "Connect"}
          </button>
        </div>
      </div>

      <div className="ff-status-card">
        <div className="ff-status-label">Total Titles</div>
        <div className="ff-status-value">{catalog.length}</div>
        <div className="ff-status-subtext">movies & shows</div>
      </div>
    </div>
  );
}
