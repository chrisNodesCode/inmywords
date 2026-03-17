"use client";

import { CATEGORIES, CategoryId } from "@/lib/theme";
import { useIMWTheme } from "@/components/ThemeProvider";

interface AnnotationTagProps {
  category: CategoryId;
  state: "confirmed" | "ai-suggested" | "unconfirmed";
}

export default function AnnotationTag({ category, state }: AnnotationTagProps) {
  const { prefs } = useIMWTheme();
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return null;

  const colors = prefs.darkMode ? cat.colors.dark : cat.colors.light;

  const baseStyle: React.CSSProperties = {
    borderLeftColor: colors.color,
  };

  if (state === "confirmed") {
    baseStyle.backgroundColor = colors.bg;
    baseStyle.color = colors.color;
  } else if (state === "ai-suggested") {
    baseStyle.color = colors.color;
  }
  // unconfirmed: dashed border overrides everything via .imw-ann--unconfirmed

  return (
    <span
      className={`imw-ann imw-ann--${state === "ai-suggested" ? "suggested" : state}`}
      style={baseStyle}
    >
      {cat.label}
    </span>
  );
}
