import { STREAMING_SERVICES } from "../../utils/constants";
import SettingsCard from "./SettingsCard";

export default function StreamingServicesSection() {
  return (
    <SettingsCard title="Streaming Services">
      <div className="ff-wrap-row ff-wrap-row--wide">
        {STREAMING_SERVICES.map((service) => (
          <div key={service.id} className="ff-badge-neutral">
            ✓ {service.label}
          </div>
        ))}
      </div>
      <div className="ff-helper-text ff-streaming-note">
        Hardcoded to your services. Fetched from the streaming catalog weekly.
      </div>
    </SettingsCard>
  );
}
