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
  streamingCacheAge,
  watchlistCount,
  watchedCount,
  onClearWatchData,
  onClearCatalogData,
  onNotify,
}) {
  return (
    <div className="ff-settings-container">
      <div className="ff-page-kicker ff-page-kicker--spaced">Settings</div>

      <div className="ff-section-stack">
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
          streamingCacheAge={streamingCacheAge}
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
