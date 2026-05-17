import { STREAMING_SERVICES } from "../../utils/constants";
import SettingsCard from "./SettingsCard";

export default function StreamingServicesSection() {
  return (
    <SettingsCard title="Streaming Services">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {STREAMING_SERVICES.map((service) => (
          <div
            key={service.id}
            style={{
              background: "#1a1a28",
              border: "1px solid #2a2a3a",
              borderRadius: 3,
              padding: "6px 14px",
              fontSize: 12,
              color: "#9090c0",
            }}
          >
            ✓ {service.label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#444", marginTop: 10 }}>
        Hardcoded to your services. Fetched from JustWatch weekly.
      </div>
    </SettingsCard>
  );
}
