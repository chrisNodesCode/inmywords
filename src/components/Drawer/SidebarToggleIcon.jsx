import React from 'react';

/**
 * SidebarToggleIcon
 * A minimal, modern toggle icon similar to ChatGPT's sidebar handle.
 * - A rounded rectangle with a single vertical divider line.
 * - The divider shifts sides based on `open` and `placement`.
 * - Uses currentColor for strokes to inherit color from parent.
 */
export default function SidebarToggleIcon({ open = false, placement = 'right', size = 28 }) {
  const w = size;
  const h = Math.round(size * 0.72);
  const r = Math.round(size * 0.22);
  const stroke = Math.max(1.5, size * 0.08);

  // Padding inside the rect
  const pad = Math.max(2, Math.round(size * 0.18));

  // Determine the line position based on open state and placement
  // For placement 'right':
  //   - closed => line near right edge (outer edge of screen)
  //   - open   => line near left edge  (inner edge of screen)
  // For placement 'left', the opposite.
  const isRight = placement === 'right';
  const lineNearLeft = (isRight && open) || (!isRight && !open);
  const x = lineNearLeft ? pad + stroke : w - pad - stroke;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
      aria-hidden
      focusable="false"
    >
      {/* Outer rounded rectangle */}
      <rect
        x={stroke / 2}
        y={stroke / 2}
        width={w - stroke}
        height={h - stroke}
        rx={r}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        opacity={0.8}
      />
      {/* Vertical divider line */}
      <line
        x1={x}
        y1={pad}
        x2={x}
        y2={h - pad}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}

