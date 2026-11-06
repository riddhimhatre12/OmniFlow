import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('omni-theme') as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        return savedTheme;
      }
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('omni-theme') as Theme | null;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effectiveTheme =
        savedTheme === 'light' || savedTheme === 'dark'
          ? savedTheme
          : systemPrefersDark
            ? 'dark'
            : 'light';
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      return effectiveTheme === 'dark';
    }
    return false;
  });

  const updateTheme = (newTheme: Theme, systemIsDark: boolean) => {
    const effectiveTheme = newTheme === 'system' ? (systemIsDark ? 'dark' : 'light') : newTheme;

    // Set data-theme attribute on html element
    document.documentElement.setAttribute('data-theme', effectiveTheme);

    // Update state
    setIsDark(effectiveTheme === 'dark');
  };

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        updateTheme('system', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('omni-theme', newTheme);

    // Determine effective theme
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateTheme(newTheme, systemPrefersDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
