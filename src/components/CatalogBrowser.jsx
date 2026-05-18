import { useState } from "react";
import CatalogBrowserCard from "./CatalogBrowserCard";
import CatalogBrowserFilters from "./CatalogBrowserFilters";

const TITLES_PER_PAGE = 50;
const GENRE_PILL_LIMIT = 10;

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
      <CatalogBrowserFilters
        catalogCount={catalog.length}
        streamingCount={streamingCount}
        plexCount={plexCount}
        activeTab={activeTab}
        setActiveTab={(value) => {
          setActiveTab(value);
          setPage(1);
        }}
        query={query}
        setQuery={(value) => {
          setQuery(value);
          setPage(1);
        }}
        typeFilter={typeFilter}
        setTypeFilter={(value) => {
          setTypeFilter(value);
          setPage(1);
        }}
        availableServices={availableServices}
        selectedServices={selectedServices}
        toggleService={toggleService}
        clearServices={() => {
          setSelectedServices([]);
          setPage(1);
        }}
        availableGenres={availableGenres}
        selectedGenre={selectedGenre}
        setSelectedGenre={(value) => {
          setSelectedGenre(value);
          setPage(1);
        }}
        sortBy={sortBy}
        setSortBy={(value) => {
          setSortBy(value);
          setPage(1);
        }}
      />

      <div className="ff-catalog-grid">
        {paginatedCatalog.map((item) => (
          <CatalogBrowserCard
            key={item.id}
            item={item}
            onAddToWatchlist={onAddToWatchlist}
          />
        ))}
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
