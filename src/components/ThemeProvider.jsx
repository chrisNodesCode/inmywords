/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

export const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => { },
});

export default function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  // Initialize theme from localStorage or matchMedia
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme');
    if (stored) {
      setDarkMode(stored === 'dark');
    } else {
      const prefersDark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Persist theme and update body attribute
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
        token: {
          fontFamily: "'IBM Plex Mono', 'Cutive Mono', monospace",
        },
        components: {
          Switch: {
            handleBg: "#7c7c7cff",
            colorPrimary: "#547b5f",
            colorPrimaryHover: "#547b5f",
          },
          Drawer: {
            colorBgElevated: darkMode ? "#1f1f1f" : "#ffffff",
            colorText: darkMode ? "#ffffff" : "#000000",
          },
        },
      }}
    >
      <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    </ConfigProvider>
  );
}
