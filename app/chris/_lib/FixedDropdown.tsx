"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const C_BG = "#15171c";
const C_BORDER = "#23262d";

// FixedDropdown renders its children in a portal-like layer anchored to a
// trigger button. Anchoring uses position:fixed so the dropdown always
// escapes any overflow:hidden ancestor (editing card, list container, etc.).
//
// Usage:
//   <div style={{ position: "relative" }}>
//     <button ref={anchorRef}>Open</button>
//     {open && (
//       <FixedDropdown anchorRef={anchorRef} onClose={...} width={220}>
//         ...items...
//       </FixedDropdown>
//     )}
//   </div>

interface Props {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  width?: number;
  maxHeight?: number;
  children: React.ReactNode;
  // prefer "below" (default) or "above"
  prefer?: "below" | "above";
}

export function FixedDropdown({
  anchorRef,
  onClose,
  width = 220,
  maxHeight = 280,
  children,
  prefer = "below",
}: Props) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const drop = dropRef.current;
      const dropH = drop ? drop.offsetHeight : maxHeight;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;

      const showAbove =
        prefer === "above" ||
        (spaceBelow < dropH && spaceAbove > spaceBelow);

      const top = showAbove
        ? rect.top - (drop ? drop.offsetHeight : 0) - 4
        : rect.bottom + 4;

      // Clamp to viewport
      const left = Math.min(
        rect.left,
        window.innerWidth - width - 8
      );

      setCoords({ top: Math.max(8, top), left: Math.max(8, left) });
    };

    // Position immediately and on scroll/resize
    position();
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [anchorRef, maxHeight, prefer, width]);

  return createPortal(
    <>
      {/* click-away backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
      />
      <div
        ref={dropRef}
        style={{
          position: "fixed",
          top: coords?.top ?? -9999,
          left: coords?.left ?? -9999,
          width,
          maxHeight,
          overflowY: "auto",
          zIndex: 9999,
          background: C_BG,
          border: `1px solid ${C_BORDER}`,
          borderRadius: 12,
          boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
          // Invisible until positioned to prevent layout flash
          opacity: coords ? 1 : 0,
          transition: "opacity 0.1s ease",
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
