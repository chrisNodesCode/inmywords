"use client";

import { FONT_OPTIONS, FontId } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";

export default function FontPicker() {
  const { prefs, setFont } = useIMWTheme();

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {FONT_OPTIONS.map((font) => {
        const isActive = prefs.font === font.id;
        return (
          <button
            key={font.id}
            onClick={() => setFont(font.id as FontId)}
            aria-label={`Font: ${font.name}`}
            title={font.name}
            className={`imw-font-chip${isActive ? " imw-font-chip--active" : ""}`}
            style={{ fontFamily: font.family }}
          >
            {font.label}
          </button>
        );
      })}
    </div>
  );
}
