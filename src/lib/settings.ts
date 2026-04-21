import { useEffect, useState } from "react";

export type TestKind = "type" | "choice" | "wheel" | "live";
export type Direction = "f2b" | "b2f" | "both";

export interface LearnSettings {
  sessionSize: number;        // max questions per session
  batchSize: number;          // cards per batch (default 5)
  correctToLearn: number;     // correct answers needed to mark "learned"
  direction: Direction;
  testKinds: TestKind[];      // enabled test types
}

export const DEFAULT_SETTINGS: LearnSettings = {
  sessionSize: 20,
  batchSize: 5,
  correctToLearn: 3,
  direction: "both",
  testKinds: ["type", "choice", "wheel", "live"],
};

const KEY = "vn_learn_settings";

export function loadSettings(): LearnSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LearnSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("vn:settings-changed"));
}

export function useSettings(): [LearnSettings, (s: LearnSettings) => void] {
  const [s, setS] = useState<LearnSettings>(() => loadSettings());
  useEffect(() => {
    const h = () => setS(loadSettings());
    window.addEventListener("vn:settings-changed", h);
    return () => window.removeEventListener("vn:settings-changed", h);
  }, []);
  return [s, (next) => { saveSettings(next); setS(next); }];
}
