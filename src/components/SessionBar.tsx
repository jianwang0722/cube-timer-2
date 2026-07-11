import { useRef, useState } from "react";
import type { Session } from "../stats";
import "./SessionBar.css";

interface SessionBarProps {
  sessions: Session[];
  currentSession: Session;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: () => string;
  onImport: (json: string) => boolean;
}

export function SessionBar({
  sessions,
  currentSession,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onExport,
  onImport,
}: SessionBarProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    onRename(currentSession.id, renameValue);
    setRenaming(false);
  };

  const exportToFile = () => {
    const blob = new Blob([onExport()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSession.name.replace(/[^\w-]+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = (file: File | undefined) => {
    if (!file) return;
    void file.text().then((text) => {
      if (!onImport(text)) {
        alert("Could not import: not a valid session file.");
      }
    });
  };

  return (
    <div className="session-bar">
      {renaming ? (
        <>
          <input
            aria-label="Session name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
          <button type="button" onClick={commitRename}>
            Save
          </button>
        </>
      ) : (
        <>
          <select
            aria-label="Session"
            value={currentSession.id}
            onChange={(e) => onSwitch(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onCreate(`Session ${sessions.length + 1}`)}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => {
              setRenameValue(currentSession.name);
              setRenaming(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `Delete session "${currentSession.name}" and its solves?`,
                )
              ) {
                onDelete(currentSession.id);
              }
            }}
          >
            Delete
          </button>
          <button type="button" onClick={exportToFile}>
            Export
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Import session file"
            onChange={(e) => {
              importFromFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
