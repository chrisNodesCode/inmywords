// src/components/ThemeSelector.jsx
import React from 'react';
import { useContext } from 'react';
import { ThemeContext } from '../theme/ThemeContext';

const presets = [
  { name: 'Light', backgroundColor: '#ffffff', color: '#000000' },
  { name: 'Dark', backgroundColor: '#000000', color: '#ffffff' },
  { name: 'Sky', backgroundColor: '#D0EFFF', color: '#003A6B' },
  { name: 'Mint', backgroundColor: '#DFFFE0', color: '#1B4F16' },
  { name: 'Peach', backgroundColor: '#FFE5D0', color: '#5B2E01' },
];

export default function ThemeSelector({ className, pillSize = 24 }) {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div className={className} style={{ display: 'flex', gap: '0.5rem' }}>
      {presets.map(p => {
        const isActive = theme.backgroundColor === p.backgroundColor && theme.color === p.color;
        return (
          <button
            key={p.name}
            title={p.name}
            onClick={() => setTheme({ backgroundColor: p.backgroundColor, color: p.color })}
            style={{
              width: pillSize,
              height: pillSize,
              borderRadius: '50%',
              border: isActive ? '2px solid #333' : '1px solid #ccc',
              backgroundColor: p.backgroundColor,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 0
            }}
          />
        );
      })}
    </div>
  );
}
