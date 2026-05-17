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
      <div className="ff-helper-text ff-helper-text--spaced">
        These library names will be skipped when connecting to Plex.
        Case-insensitive. Add any library you don't want in recommendations.
      </div>
      <div className="ff-wrap-row ff-wrap-row--spaced">
        {excludedLibraries.map((library) => {
          const normalizedLibrary = normalizeLibraryName(library);

          return (
            <div key={normalizedLibrary} className="ff-tag">
              {library}
              <button
                onClick={() => removeExcludedLibrary(library)}
                className="ff-tag__remove"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div className="ff-control-row">
        <input
          value={excludedInput}
          onChange={(event) => setExcludedInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              addExcludedLibrary();
            }
          }}
          placeholder="Library name to exclude…"
          className="ff-input ff-input--mono"
        />
        <button
          onClick={addExcludedLibrary}
          className="ff-button-primary"
        >
          + Add
        </button>
      </div>
    </SettingsCard>
  );
}
