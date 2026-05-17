export default function SettingsCard({ title, children }) {
  return (
    <div className="ff-settings-card">
      <div className="ff-settings-card__title">{title}</div>
      {children}
    </div>
  );
}
