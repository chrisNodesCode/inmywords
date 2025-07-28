import React, { useContext } from 'react';
import { Switch } from 'antd';
import { ThemeContext } from './ThemeProvider';

export default function Settings() {
  const { darkMode, toggleTheme } = useContext(ThemeContext);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Settings</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>Dark Mode</span>
        <Switch checked={darkMode} onChange={toggleTheme} />
      </div>
    </div>
  );
}
