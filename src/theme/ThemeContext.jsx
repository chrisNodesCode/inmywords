// src/theme/ThemeContext.jsx
import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState({
    backgroundColor: '#ffffff',
    color: '#000000',
  });

  // add a log so we can see updates:
  const handleSetTheme = (newTheme) => {
    console.log('▶️ New theme:', newTheme);
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}