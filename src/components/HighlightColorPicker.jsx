import React, { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

const SWATCHES = {
  blue: '#1677ff',
  green: '#52c41a',
  red: '#ff4d4f',
  yellow: '#faad14',
  purple: '#722ed1',
};

export default function HighlightColorPicker() {
  const { highlightColor, setHighlightColor } = useContext(ThemeContext);

  const handleSelect = (color) => {
    setHighlightColor(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('highlightColor', color);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {Object.entries(SWATCHES).map(([name, color]) => (
        <button
          key={name}
          onClick={() => handleSelect(name)}
          aria-label={`select ${name}`}
          style={{
            width: '1.25rem',
            height: '1.25rem',
            borderRadius: '50%',
            border: highlightColor === name ? '2px solid var(--highlight-color)' : '2px solid transparent',
            backgroundColor: color,
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}
