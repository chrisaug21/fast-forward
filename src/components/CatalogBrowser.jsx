import { useState } from "react";

const TITLES_PER_PAGE = 50;
const GENRE_PILL_LIMIT = 10;

const SORT_OPTIONS = [
  ["rating-desc", "Rating (Highest)"],
  ["title-asc", "Title A-Z"],
  ["title-desc", "Title Z-A"],
  ["year-desc", "Year (Newest)"],
  ["year-asc", "Year (Oldest)"],
];

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function compareTitles(left, right) {
  return (left.title || "").localeCompare(right.title || "", undefined, {
    sensitivity: "base",
  });
}

export default function CatalogBrowser({ catalog, onAddToWatchlist }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("rating-desc");
  const [page, setPage] = useState(1);

  const serviceCounts = new Map();
  const genreCounts = new Map();

  catalog.forEach((item) => {
    if (item.source === "streaming" && Array.isArray(item.streamingOn)) {
      item.streamingOn.forEach((service) => {
        if (!service || service === "Plex (Local)") {
          return;
        }

        serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
      });
    }

    if (Array.isArray(item.genres)) {
      item.genres.forEach((genre) => {
        if (!genre) {
          return;
        }

        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    }
  });

  const availableServices = Array.from(serviceCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([service]) => service);

  const availableGenres = Array.from(genreCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, GENRE_PILL_LIMIT)
    .map(([genre]) => genre);

  const normalizedQuery = normalizeText(query);
  const filteredCatalog = catalog.filter((item) => {
    const matchesQuery =
      normalizedQuery.length === 0 || normalizeText(item.title).includes(normalizedQuery);

    if (!matchesQuery) {
      return false;
    }

    if (activeTab === "streaming" && item.source !== "streaming") {
      return false;
    }

    if (activeTab === "plex" && item.source !== "plex") {
      return false;
    }

    if (typeFilter === "movies" && item.type !== "Movie") {
      return false;
    }

    if (typeFilter === "tv" && item.type !== "TV Show") {
      return false;
    }

    if (selectedServices.length > 0) {
      const itemServices = Array.isArray(item.streamingOn) ? item.streamingOn : [];
      const matchesService = selectedServices.some((service) =>
        itemServices.includes(service)
      );

      if (!matchesService) {
        return false;
      }
    }

    if (selectedGenre !== "all") {
      const itemGenres = Array.isArray(item.genres) ? item.genres : [];
      if (!itemGenres.includes(selectedGenre)) {
        return false;
      }
    }

    return true;
  });

  const sortedCatalog = [...filteredCatalog].sort((left, right) => {
    if (sortBy === "title-asc") {
      return compareTitles(left, right);
    }

    if (sortBy === "title-desc") {
      return compareTitles(right, left);
    }

    if (sortBy === "year-desc") {
      return (right.releaseYear || 0) - (left.releaseYear || 0) || compareTitles(left, right);
    }

    if (sortBy === "year-asc") {
      const leftYear = left.releaseYear ?? Number.MAX_SAFE_INTEGER;
      const rightYear = right.releaseYear ?? Number.MAX_SAFE_INTEGER;
      return leftYear - rightYear || compareTitles(left, right);
    }

    const leftRating = left.imdbScore ?? -1;
    const rightRating = right.imdbScore ?? -1;
    return rightRating - leftRating || compareTitles(left, right);
  });

  const totalPages = Math.max(1, Math.ceil(sortedCatalog.length / TITLES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * TITLES_PER_PAGE;
  const paginatedCatalog = sortedCatalog.slice(pageStart, pageStart + TITLES_PER_PAGE);

  if (catalog.length === 0) {
    return null;
  }

  function toggleService(service) {
    setPage(1);
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service]
    );
  }

  const streamingCount = catalog.filter((item) => item.source === "streaming").length;
  const plexCount = catalog.filter((item) => item.source === "plex").length;

  return (
    <div>
      <div className="ff-catalog-header">
        <div className="ff-catalog-controls">
          <div className="ff-catalog-title">Browse Catalog</div>
          <div className="ff-filter-tabs">
            {[
              ["all", "All", catalog.length],
              ["streaming", "Streaming", streamingCount],
              ["plex", "Plex", plexCount],
            ].map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setPage(1);
                }}
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
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="ff-catalog-header">
        <div className="ff-catalog-controls">
          <div className="ff-filter-tabs">
            {[
              ["all", "All"],
              ["movies", "Movies"],
              ["tv", "TV Shows"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setTypeFilter(id);
                  setPage(1);
                }}
                className={`ff-filter-tab${typeFilter === id ? " ff-filter-tab--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {availableServices.length > 0 && (
            <div className="ff-chip-row">
              <button
                onClick={() => {
                  setSelectedServices([]);
                  setPage(1);
                }}
                className={`ff-chip${selectedServices.length === 0 ? " ff-filter-tab--active" : ""}`}
              >
                All
              </button>

              {availableServices.map((service) => (
                <button
                  key={service}
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
                onClick={() => {
                  setSelectedGenre("all");
                  setPage(1);
                }}
                className={`ff-chip${selectedGenre === "all" ? " ff-filter-tab--active" : ""}`}
              >
                All
              </button>

              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => {
                    setSelectedGenre(genre);
                    setPage(1);
                  }}
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
          onChange={(event) => {
            setSortBy(event.target.value);
            setPage(1);
          }}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="ff-catalog-grid">
        {paginatedCatalog.map((item) => {
          const sourceLabel =
            item.source === "streaming" ? item.streamingOn?.[0] || "Streaming" : "Plex";

          return (
            <div
              key={item.id}
              className="ff-card"
              onClick={() => onAddToWatchlist(item)}
              title="Click to add to watchlist"
            >
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

              {item.imdbScore && <div className="ff-card-rating">★ {item.imdbScore}</div>}
            </div>
          );
        })}
      </div>

      <div className="ff-catalog-footnote">
        Page {currentPage} of {totalPages}
      </div>

      <div className="ff-filter-tabs">
        <button
          onClick={() => setPage((currentValue) => Math.max(1, currentValue - 1))}
          disabled={currentPage === 1}
          className={`ff-filter-tab${currentPage === 1 ? "" : " ff-filter-tab--active"}`}
        >
          Prev
        </button>
        <button
          onClick={() => setPage((currentValue) => Math.min(totalPages, currentValue + 1))}
          disabled={currentPage === totalPages}
          className={`ff-filter-tab${
            currentPage === totalPages ? "" : " ff-filter-tab--active"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
