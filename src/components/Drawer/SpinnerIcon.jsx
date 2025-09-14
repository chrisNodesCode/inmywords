import React from 'react';

export default function SpinnerIcon({ size = 28, strokeWidth = 3 }) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  // Show a 70% arc for a modern spinner look
  const dash = 0.7 * circumference;
  const gap = circumference - dash;

  return (
    <svg
      className="spinnerIcon"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        transform={`rotate(-90 ${c} ${c})`}
      />
    </svg>
  );
}

