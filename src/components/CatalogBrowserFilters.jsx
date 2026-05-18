const SORT_OPTIONS = [
  ["rating-desc", "Rating (Highest)"],
  ["title-asc", "Title A-Z"],
  ["title-desc", "Title Z-A"],
  ["year-desc", "Year (Newest)"],
  ["year-asc", "Year (Oldest)"],
];

export default function CatalogBrowserFilters({
  catalogCount,
  streamingCount,
  plexCount,
  activeTab,
  setActiveTab,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  availableServices,
  selectedServices,
  toggleService,
  clearServices,
  availableGenres,
  selectedGenre,
  setSelectedGenre,
  sortBy,
  setSortBy,
}) {
  return (
    <>
      <div className="ff-catalog-header">
        <div className="ff-catalog-controls">
          <div className="ff-catalog-title">Browse Catalog</div>
          <div className="ff-filter-tabs">
            {[
              ["all", "All", catalogCount],
              ["streaming", "Streaming", streamingCount],
              ["plex", "Plex", plexCount],
            ].map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`ff-filter-tab${activeTab === id ? " ff-filter-tab--active" : ""}`}
              >
                {label} {count}
              </button>
            ))}
          </div>
        </div>

        <input
          className="ff-input ff-catalog-search"
          placeholder="Search catalog"
          aria-label="Search catalog"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="ff-catalog-header">
        <div className="ff-catalog-controls ff-catalog-controls--stacked">
          <div className="ff-filter-tabs">
            {[
              ["all", "All"],
              ["movies", "Movies"],
              ["tv", "TV Shows"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={`ff-filter-tab${typeFilter === id ? " ff-filter-tab--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {availableServices.length > 0 && (
            <div className="ff-chip-row">
              <button
                type="button"
                onClick={clearServices}
                className={`ff-chip${selectedServices.length === 0 ? " ff-filter-tab--active" : ""}`}
              >
                All
              </button>

              {availableServices.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`ff-chip${
                    selectedServices.includes(service) ? " ff-filter-tab--active" : ""
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          )}

          {availableGenres.length > 0 && (
            <div className="ff-chip-row">
              <button
                type="button"
                onClick={() => setSelectedGenre("all")}
                className={`ff-chip${selectedGenre === "all" ? " ff-filter-tab--active" : ""}`}
              >
                All
              </button>

              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`ff-chip${selectedGenre === genre ? " ff-filter-tab--active" : ""}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          className="ff-input ff-catalog-search"
          aria-label="Sort catalog"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
