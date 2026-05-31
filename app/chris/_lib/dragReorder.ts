"use client";

import { useState } from "react";

// HTML5 drag-and-drop reorder hook. Pure — does not mutate state. The hook
// tracks drag/over visual state; on a successful drop it computes the new
// order and calls applyReorder(newItems). The caller persists.
//
// Instantiate one hook per drag group (so each visible group is isolated from
// the others and you can't drop across groups).
export function useDragReorder<T extends { id: string }>(
  items: T[],
  applyReorder: (newItems: T[]) => void,
  accent: string = "#c9a86a"
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const rowProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", id);
      } catch {
        /* Safari is occasionally picky */
      }
      setDraggingId(id);
    },
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      // Only accept the drag if it originated in THIS hook instance (same
      // group). Cross-group drops fall through without preventDefault and the
      // browser rejects them.
      if (!draggingId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (id !== draggingId) setOverId(id);
    },
    onDragLeave: () => {
      setOverId((prev) => (prev === id ? null : prev));
    },
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      const dragId = draggingId;
      setDraggingId(null);
      setOverId(null);
      if (!dragId || dragId === id) return;
      const fromIdx = items.findIndex((x) => x.id === dragId);
      const toIdx = items.findIndex((x) => x.id === id);
      if (fromIdx < 0 || toIdx < 0) return;
      const next = [...items];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      applyReorder(next);
    },
    onDragEnd: () => {
      setDraggingId(null);
      setOverId(null);
    },
  });

  const rowStyle = (id: string): React.CSSProperties => ({
    opacity: id === draggingId ? 0.4 : 1,
    cursor: "grab",
    boxShadow:
      id === overId && id !== draggingId
        ? `inset 0 2px 0 0 ${accent}`
        : undefined,
    transition: "opacity 0.12s ease, box-shadow 0.12s ease",
  });

  return { rowProps, rowStyle, draggingId, overId };
}
