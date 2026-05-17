export default function SettingsCard({ title, children }) {
  return (
    <div
      style={{
        background: "#0c0c16",
        border: "1px solid #1a1a24",
        borderRadius: 4,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#888",
          letterSpacing: "0.1em",
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
