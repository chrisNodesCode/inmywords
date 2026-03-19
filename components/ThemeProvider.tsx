"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useTheme } from "next-themes";
import {
  AccentId,
  FontId,
  FONT_OPTIONS,
  USER_PREFERENCE_DEFAULTS,
} from "@/lib/theme";

interface Preferences {
  accent: AccentId;
  font: FontId;
  darkMode: boolean;
  deepWriteDefault: boolean;
  editorFontSize: number;
  editorLineWidth: string;
  autoAnalyze: boolean;
}

interface ThemeContextValue {
  prefs: Preferences;
  setAccent: (accent: AccentId) => void;
  setFont: (font: FontId) => void;
  setDarkMode: (dark: boolean) => void;
  setDeepWriteDefault: (val: boolean) => void;
  setEditorFontSize: (size: number) => void;
  setEditorLineWidth: (width: string) => void;
  setAutoAnalyze: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useIMWTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useIMWTheme must be used inside IMWThemeProvider");
  return ctx;
}

function applyToHtml(prefs: Preferences) {
  const html = document.documentElement;
  html.setAttribute("data-mode", prefs.darkMode ? "dark" : "light");
  html.setAttribute("data-accent", prefs.accent);
  html.setAttribute("data-font", prefs.font);
  const fontFamily =
    FONT_OPTIONS.find((f) => f.id === prefs.font)?.family ??
    FONT_OPTIONS[0].family;
  html.style.setProperty("--imw-font-body", fontFamily);
}

async function savePrefs(partial: Partial<Preferences>) {
  await fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
}

const DEFAULT_PREFS: Preferences = {
  accent: USER_PREFERENCE_DEFAULTS.accent,
  font: USER_PREFERENCE_DEFAULTS.font,
  darkMode: USER_PREFERENCE_DEFAULTS.darkMode,
  deepWriteDefault: false,
  editorFontSize: USER_PREFERENCE_DEFAULTS.editorFontSize,
  editorLineWidth: USER_PREFERENCE_DEFAULTS.editorLineWidth,
  autoAnalyze: false,
};

export function IMWThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const { resolvedTheme } = useTheme();

  // On mount: fetch preferences from DB, apply to <html>
  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data: Preferences) => {
        setPrefs(data);
        applyToHtml(data);
      })
      .catch(() => {
        // Fall back to system dark mode preference from next-themes
        const systemDark = resolvedTheme === "dark";
        const fallback = { ...DEFAULT_PREFS, darkMode: systemDark };
        setPrefs(fallback);
        applyToHtml(fallback);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        applyToHtml(next);
        savePrefs({ [key]: value });
        return next;
      });
    },
    []
  );

  const setAccent = useCallback(
    (accent: AccentId) => updatePref("accent", accent),
    [updatePref]
  );
  const setFont = useCallback(
    (font: FontId) => updatePref("font", font),
    [updatePref]
  );
  const setDarkMode = useCallback(
    (dark: boolean) => updatePref("darkMode", dark),
    [updatePref]
  );
  const setDeepWriteDefault = useCallback(
    (val: boolean) => updatePref("deepWriteDefault", val),
    [updatePref]
  );
  const setEditorFontSize = useCallback(
    (size: number) => updatePref("editorFontSize", size),
    [updatePref]
  );
  const setEditorLineWidth = useCallback(
    (width: string) => updatePref("editorLineWidth", width),
    [updatePref]
  );
  const setAutoAnalyze = useCallback(
    (val: boolean) => updatePref("autoAnalyze", val),
    [updatePref]
  );

  return (
    <ThemeContext.Provider
      value={{
        prefs,
        setAccent,
        setFont,
        setDarkMode,
        setDeepWriteDefault,
        setEditorFontSize,
        setEditorLineWidth,
        setAutoAnalyze,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
