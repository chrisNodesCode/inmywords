/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';

export const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => { },
});

export default function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  const lightTokens = {
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorTextBase: '#000000',
    colorText: '#000000',
    colorPrimary: '#547b5f',
  };

  const darkTokens = {
    colorBgBase: '#141414',
    colorBgContainer: '#1f1f1f',
    colorTextBase: '#ffffff',
    colorText: '#ffffff',
    colorPrimary: '#547b5f',
  };

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

    // Expose Windows-95 style variables for inputs/buttons
    const root = document.documentElement;
    const lightVars = {
      '--indie-bg': '#c0c0c0',
      '--indie-border-light': '#ffffff',
      '--indie-border-dark': '#808080',
      '--indie-text': '#000000',
    };
    const darkVars = {
      '--indie-bg': '#3a3a3a',
      '--indie-border-light': '#999999',
      '--indie-border-dark': '#000000',
      '--indie-text': '#ffffff',
    };
    const vars = darkMode ? darkVars : lightVars;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [darkMode]);

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
      <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    </ConfigProvider>
  );
}
