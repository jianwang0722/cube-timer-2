import { useEffect, useRef, useState } from "react";
import type { Session } from "../stats";
import "./TopBar.css";

interface TopBarProps {
  sessions: Session[];
  currentSession: Session;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: () => string;
  onImport: (json: string) => boolean;
  onOpenSettings: () => void;
  onMenuOpenChange?: (open: boolean) => void;
  inspectionEnabled: boolean;
  onToggleInspection: () => void;
}

export function TopBar({
  sessions,
  currentSession,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onExport,
  onImport,
  onOpenSettings,
  onMenuOpenChange,
  inspectionEnabled,
  onToggleInspection,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    onMenuOpenChange?.(next);
    if (!next) setRenaming(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        onMenuOpenChange?.(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onMenuOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onMenuOpenChange]);

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

  return (
    <header className="topbar">
      <span className="topbar__wordmark">SpeedCubeTimer</span>
      <div className="topbar__actions">
        <div className="session-menu" ref={menuRef}>
          <button
            type="button"
            className="session-menu__pill"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setMenuOpen(!open)}
          >
            <span className="session-menu__dot" aria-hidden="true" />
            {currentSession.name}
            <span aria-hidden="true"> ▾</span>
          </button>
          {open && (
            <div
              className="session-menu__panel"
              role="menu"
              aria-label="Sessions"
            >
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={s.id === currentSession.id}
                  className="session-menu__item"
                  onClick={() => {
                    onSwitch(s.id);
                    setMenuOpen(false);
                  }}
                >
                  {s.name}
                  <span className="session-menu__count">{s.solves.length}</span>
                </button>
              ))}
              <hr className="session-menu__rule" />
              {renaming ? (
                <div className="session-menu__rename">
                  <input
                    aria-label="Session name"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setRenaming(false);
                      }
                    }}
                  />
                  <button type="button" onClick={commitRename}>
                    Save
                  </button>
                </div>
              ) : (
                <div className="session-menu__actions">
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(`Session ${sessions.length + 1}`);
                      setMenuOpen(false);
                    }}
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
                        setMenuOpen(false);
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button type="button" onClick={exportToFile}>
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Import
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                aria-label="Import session file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void file.text().then((text) => {
                      if (!onImport(text)) {
                        alert("Could not import: not a valid session file.");
                      }
                    });
                  }
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          className="topbar__chip"
          title="Toggle 15s WCA inspection"
          aria-pressed={inspectionEnabled}
          onClick={onToggleInspection}
        >
          <span
            className={`topbar__chip-dot${inspectionEnabled ? " topbar__chip-dot--on" : ""}`}
            aria-hidden="true"
          />
          {inspectionEnabled ? "inspection 15s" : "inspection off"}
        </button>
        <button
          type="button"
          className="topbar__settings"
          onClick={onOpenSettings}
        >
          <span aria-hidden="true">⚙ </span>settings
        </button>
      </div>
    </header>
  );
}
