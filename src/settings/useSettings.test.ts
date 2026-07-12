import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS, SETTINGS_KEY, useSettings } from "./useSettings";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test("starts with defaults and applies the dark theme attribute", () => {
  const { result } = renderHook(() => useSettings());
  expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("updates persist and re-apply on remount", () => {
  const first = renderHook(() => useSettings());
  act(() => first.result.current.update({ theme: "light", holdMs: 500 }));
  expect(document.documentElement.dataset.theme).toBe("light");
  first.unmount();

  const second = renderHook(() => useSettings());
  expect(second.result.current.settings.theme).toBe("light");
  expect(second.result.current.settings.holdMs).toBe(500);
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("garbage or out-of-range stored values fall back to defaults", () => {
  localStorage.setItem(SETTINGS_KEY, "{nope");
  expect(renderHook(() => useSettings()).result.current.settings).toEqual(
    DEFAULT_SETTINGS,
  );

  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ theme: "hotdog", holdMs: 99999, inspectionSound: "yes" }),
  );
  const { result } = renderHook(() => useSettings());
  expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
});

test("update clamps invalid patches", () => {
  const { result } = renderHook(() => useSettings());
  act(() => result.current.update({ holdMs: 5 }));
  expect(result.current.settings.holdMs).toBe(300);
});
