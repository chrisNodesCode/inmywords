/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';

const HIGHLIGHT_COLORS = {
  blue: { light: '#1677ff', dark: '#69b1ff' },
  green: { light: '#52c41a', dark: '#95de64' },
  red: { light: '#ff4d4f', dark: '#ff7875' },
  yellow: { light: '#faad14', dark: '#ffd666' },
  purple: { light: '#722ed1', dark: '#b37feb' },
};

export const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => {},
  highlightColor: 'green',
  setHighlightColor: () => {},
});

export default function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState('green');

  const lightTokens = {
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorTextBase: '#000000',
    colorText: '#000000',
    colorPrimary: HIGHLIGHT_COLORS[highlightColor].light,
  };

  const darkTokens = {
    colorBgBase: '#141414',
    colorBgContainer: '#1f1f1f',
    colorTextBase: '#ffffff',
    colorText: '#ffffff',
    colorPrimary: HIGHLIGHT_COLORS[highlightColor].dark,
  };

  // Initialize theme from localStorage or matchMedia
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setDarkMode(storedTheme === 'dark');
    } else {
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
    const storedHighlight = localStorage.getItem('highlightColor');
    if (storedHighlight && HIGHLIGHT_COLORS[storedHighlight]) {
      setHighlightColor(storedHighlight);
    }
  }, []);

  // Persist theme and update body attribute
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Persist highlight color and update CSS variable
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('highlightColor', highlightColor);
    const value = HIGHLIGHT_COLORS[highlightColor][darkMode ? 'dark' : 'light'];
    document.body.style.setProperty('--highlight-color', value);
  }, [highlightColor, darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const tokens = darkMode ? darkTokens : lightTokens;

  const switchTokens = darkMode
    ? {
      handleBg: '#fff',
      colorPrimary: '#d9d9d9',
      colorPrimaryHover: '#f0f0f0',
    }
    : {
      handleBg: '#fff',
      colorPrimary: '#595959',
      colorPrimaryHover: '#434343',
    };

  return (
    <ConfigProvider
      theme={{
        cssVar: true,
        token: {
          fontFamily: "'IBM Plex Mono', 'Cutive Mono', monospace",
          ...tokens,
        },
        components: {
          Switch: switchTokens,
          Drawer: {
            colorBgElevated: tokens.colorBgContainer,
            colorText: tokens.colorText,
          },
          Tree: {
            // Centralized Tree tokens (baseline light/dark via `tokens` above)
            indentSize: 20,
            titleHeight: 36,
            nodeHoverBg: darkMode ? '#262626' : 'rgba(0,0,0,0.04)',
            nodeSelectedBg: darkMode ? '#333333' : '#e6e6e6',
            directoryNodeSelectedBg: darkMode ? '#333333' : '#e6e6e6',
            fontSize: 16,
          },
        },
      }}
    >
      <ThemeContext.Provider value={{ darkMode, toggleTheme, highlightColor, setHighlightColor }}>
        {children}
      </ThemeContext.Provider>
    </ConfigProvider>
  );
}
