"use client";

import { ACCENT_COLORS, AccentId } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";

export default function AccentPicker() {
  const { prefs, setAccent } = useIMWTheme();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ACCENT_COLORS.map((accent) => {
        const isActive = prefs.accent === accent.id;
        // Use light.main swatch color — visible enough in both modes
        const dotColor = accent.light.main;
        return (
          <button
            key={accent.id}
            onClick={() => setAccent(accent.id as AccentId)}
            aria-label={`Accent: ${accent.name}`}
            title={accent.name}
            className={`imw-swatch${isActive ? " imw-swatch--active" : ""}`}
            style={{ backgroundColor: dotColor }}
          />
        );
      })}
    </div>
  );
}
