import type { Settings } from "../settings";
import "./SettingsDialog.css";

interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

const HOLD_PRESETS = [250, 300, 500];

export function SettingsDialog({
  open,
  settings,
  onUpdate,
  onClose,
}: SettingsDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="settings__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog open className="settings" aria-label="Settings">
        <h2 className="settings__title ui-label">settings</h2>

        <label className="settings__row">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(e) =>
              onUpdate({ theme: e.target.value as Settings["theme"] })
            }
          >
            <option value="dark">dark</option>
            <option value="light">light</option>
          </select>
        </label>

        <label className="settings__row">
          <span>15s WCA inspection</span>
          <input
            type="checkbox"
            checked={settings.inspectionEnabled}
            onChange={(e) => onUpdate({ inspectionEnabled: e.target.checked })}
          />
        </label>

        <label className="settings__row">
          <span>Inspection warning sound (8s/12s)</span>
          <input
            type="checkbox"
            checked={settings.inspectionSound}
            onChange={(e) => onUpdate({ inspectionSound: e.target.checked })}
          />
        </label>

        <label className="settings__row">
          <span>Hold to arm</span>
          <select
            value={String(settings.holdMs)}
            onChange={(e) => onUpdate({ holdMs: Number(e.target.value) })}
          >
            {HOLD_PRESETS.map((ms) => (
              <option key={ms} value={ms}>
                {ms} ms
              </option>
            ))}
          </select>
        </label>

        <label className="settings__row">
          <span>3D preview</span>
          <input
            type="checkbox"
            checked={settings.showPreview}
            onChange={(e) => onUpdate({ showPreview: e.target.checked })}
          />
        </label>

        <button type="button" className="settings__close" onClick={onClose}>
          Close
        </button>
      </dialog>
    </>
  );
}
