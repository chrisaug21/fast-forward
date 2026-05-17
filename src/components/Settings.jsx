import DataSection from "./settings/DataSection";
import ExcludedLibrariesSection from "./settings/ExcludedLibrariesSection";
import PlexConnectionSection from "./settings/PlexConnectionSection";
import StreamingServicesSection from "./settings/StreamingServicesSection";

export default function Settings({
  plexUrl,
  plexToken,
  excludedLibraries,
  onPlexUrlChange,
  onPlexTokenChange,
  onExcludedLibrariesChange,
  justWatchCacheAge,
  watchlistCount,
  watchedCount,
  onClearWatchData,
  onClearCatalogData,
  onNotify,
}) {
  return (
    <div style={{ maxWidth: 520 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "#555",
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        Settings
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <PlexConnectionSection
          plexUrl={plexUrl}
          plexToken={plexToken}
          onPlexUrlChange={onPlexUrlChange}
          onPlexTokenChange={onPlexTokenChange}
        />
        <StreamingServicesSection />
        <ExcludedLibrariesSection
          excludedLibraries={excludedLibraries}
          onExcludedLibrariesChange={onExcludedLibrariesChange}
        />
        <DataSection
          justWatchCacheAge={justWatchCacheAge}
          watchlistCount={watchlistCount}
          watchedCount={watchedCount}
          onClearWatchData={onClearWatchData}
          onClearCatalogData={onClearCatalogData}
          onNotify={onNotify}
        />
      </div>
    </div>
  );
}
