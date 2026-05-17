import SettingsCard from "./SettingsCard";

export default function PlexConnectionSection({
  plexUrl,
  plexToken,
  onPlexUrlChange,
  onPlexTokenChange,
}) {
  return (
    <SettingsCard title="Plex Connection">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label
            style={{
              fontSize: 11,
              color: "#555",
              display: "block",
              marginBottom: 5,
              letterSpacing: "0.1em",
            }}
          >
            PLEX URL
          </label>
          <input
            value={plexUrl}
            onChange={(event) => onPlexUrlChange(event.target.value)}
            placeholder="http://192.168.4.x:32400"
            style={{
              width: "100%",
              background: "#080810",
              border: "1px solid #202030",
              borderRadius: 3,
              padding: "8px 12px",
              color: "#ccc",
              fontSize: 13,
              fontFamily: "monospace",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: "#555",
              display: "block",
              marginBottom: 5,
              letterSpacing: "0.1em",
            }}
          >
            PLEX TOKEN
          </label>
          <input
            type="password"
            value={plexToken}
            onChange={(event) => onPlexTokenChange(event.target.value)}
            placeholder="Your X-Plex-Token"
            style={{
              width: "100%",
              background: "#080810",
              border: "1px solid #202030",
              borderRadius: 3,
              padding: "8px 12px",
              color: "#ccc",
              fontSize: 13,
              fontFamily: "monospace",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>
          Find your token: Plex Web → Settings → Troubleshoot → "Get an
          X-Plex-Token". Only works on local network.
        </div>
      </div>
    </SettingsCard>
  );
}
