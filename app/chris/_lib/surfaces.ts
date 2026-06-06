// Canonical list of playground surfaces (micro-apps), in landing-tile order.
// Used by the breadcrumb SurfaceSwitcher for quick cross-surface navigation.

export type Surface = { name: string; href: string };

export const SURFACES: Surface[] = [
  { name: "todos", href: "/chris/todos" },
  { name: "calendar", href: "/chris/calendar" },
  { name: "projects", href: "/chris/projects" },
  { name: "journal", href: "/chris/journal" },
  { name: "shopping", href: "/chris/shopping" },
  { name: "prompts", href: "/chris/prompts" },
  { name: "messages", href: "/chris/messages" },
  { name: "budget", href: "/chris/budget" },
];
