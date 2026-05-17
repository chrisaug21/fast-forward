import { useState } from "react";
import SettingsCard from "./SettingsCard";

export default function ExcludedLibrariesSection({
  excludedLibraries,
  onExcludedLibrariesChange,
}) {
  const [excludedInput, setExcludedInput] = useState("");

  function normalizeLibraryName(value) {
    return value.trim().toLowerCase();
  }

  function addExcludedLibrary() {
    const normalizedInput = normalizeLibraryName(excludedInput);

    if (!normalizedInput) {
      return;
    }

    const existingLibraries = new Set(
      excludedLibraries.map((library) => normalizeLibraryName(library))
    );

    if (existingLibraries.has(normalizedInput)) {
      setExcludedInput("");
      return;
    }

    const updated = [...excludedLibraries, normalizedInput];
    onExcludedLibrariesChange(updated);
    setExcludedInput("");
  }

  function removeExcludedLibrary(libraryName) {
    const normalizedLibraryName = normalizeLibraryName(libraryName);
    const updated = excludedLibraries.filter(
      (library) => normalizeLibraryName(library) !== normalizedLibraryName
    );
    onExcludedLibrariesChange(updated);
  }

  return (
    <SettingsCard title="Excluded Plex Libraries">
      <div style={{ fontSize: 11, color: "#444", marginBottom: 12, lineHeight: 1.6 }}>
        These library names will be skipped when connecting to Plex.
        Case-insensitive. Add any library you don't want in recommendations.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {excludedLibraries.map((library) => {
          const normalizedLibrary = normalizeLibraryName(library);

          return (
          <div
            key={normalizedLibrary}
            style={{
              background: "#1a1218",
              border: "1px solid #2a1a20",
              borderRadius: 3,
              padding: "4px 10px",
              fontSize: 11,
              color: "#a06070",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {library}
            <button
              onClick={() => removeExcludedLibrary(library)}
              style={{
                background: "none",
                border: "none",
                color: "#604050",
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={excludedInput}
          onChange={(event) => setExcludedInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              addExcludedLibrary();
            }
          }}
          placeholder="Library name to exclude…"
          style={{
            flex: 1,
            background: "#080810",
            border: "1px solid #202030",
            borderRadius: 3,
            padding: "6px 10px",
            color: "#ccc",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={addExcludedLibrary}
          style={{
            background: "#1a1218",
            border: "1px solid #2a1a20",
            color: "#a06070",
            padding: "6px 14px",
            borderRadius: 3,
            fontSize: 11,
          }}
        >
          + Add
        </button>
      </div>
    </SettingsCard>
  );
}
