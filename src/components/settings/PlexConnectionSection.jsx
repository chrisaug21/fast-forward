import SettingsCard from "./SettingsCard";

export default function PlexConnectionSection({
  plexUrl,
  plexToken,
  onPlexUrlChange,
  onPlexTokenChange,
}) {
  return (
    <SettingsCard title="Plex Connection">
      <div className="ff-form-stack">
        <div>
          <label className="ff-form-label">PLEX URL</label>
          <input
            value={plexUrl}
            onChange={(event) => onPlexUrlChange(event.target.value)}
            placeholder="http://192.168.4.x:32400"
            className="ff-input ff-input--mono"
          />
        </div>
        <div>
          <label className="ff-form-label">PLEX TOKEN</label>
          <input
            type="password"
            value={plexToken}
            onChange={(event) => onPlexTokenChange(event.target.value)}
            placeholder="Your X-Plex-Token"
            className="ff-input ff-input--mono"
          />
        </div>
        <div className="ff-helper-text">
          Find your token: Plex Web → Settings → Troubleshoot → "Get an
          X-Plex-Token". Only works on local network.
        </div>
      </div>
    </SettingsCard>
  );
}
